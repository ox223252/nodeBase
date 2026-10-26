#!/bin/sh
# construit dist/<nom>_<version>-<rev>_all.deb à partir des sources
# usage : packaging/deb/build.sh [ révision ]   ( défaut : 1 )
#
# les fichiers de packaging/deb/ sont des modèles, marqueurs remplacés :
#   @NAME@    nom du paquet ( "name" de package.json )
#   @ENV@     préfixe des variables d'environnement ( NAME en majuscules, cf src/args.js )
#   @VERSION@ version du paquet ( "version" de package.json + révision )
#   @SIZE@    taille installée en Ko ( control uniquement )
set -e

HERE=$( cd "$( dirname "$0" )" && pwd )
ROOT=$( cd "$HERE/../.." && pwd )
NAME=$( node -p "require('$ROOT/package.json').name" )
ENV=$( echo "$NAME" | tr 'a-z' 'A-Z' | tr -d '[:space:]' )
VERSION=$( node -p "require('$ROOT/package.json').version" )-${1:-1}

BUILD=$( mktemp -d )
trap 'rm -rf "$BUILD"' EXIT
PKG=$BUILD/${NAME}_${VERSION}_all
APP=$PKG/usr/share/$NAME

# copie un modèle en remplaçant les marqueurs : subst <source> <destination>
subst ( )
{
	sed -e "s/@NAME@/$NAME/g" \
		-e "s/@ENV@/$ENV/g" \
		-e "s/@VERSION@/$VERSION/g" \
		-e "s/@SIZE@/${SIZE:-0}/g" \
		"$1" > "$2"
}

# 1. arborescence finale, telle qu'elle sera sur la machine cible
mkdir -p "$APP" "$PKG/DEBIAN" "$PKG/etc/$NAME" "$PKG/usr/lib/systemd/system"

cp -r "$ROOT/index.js" "$ROOT/package.json" "$ROOT/package-lock.json" \
	"$ROOT/src" "$ROOT/views" "$ROOT/public" "$APP/"
( cd "$APP" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error )

subst "$HERE/default.in" "$PKG/etc/$NAME/default"
subst "$HERE/service.in" "$PKG/usr/lib/systemd/system/$NAME.service"

# 2. métadonnées
for f in conffiles postinst prerm postrm
do
	subst "$HERE/$f" "$PKG/DEBIAN/$f"
done
SIZE=$( du -sk --exclude=DEBIAN "$PKG" | cut -f1 )
subst "$HERE/control.in" "$PKG/DEBIAN/control"

# 3. droits : 755 dossiers / 644 fichiers, scripts exécutables
chmod -R u=rwX,go=rX "$PKG"
chmod 755 "$PKG/DEBIAN/postinst" "$PKG/DEBIAN/prerm" "$PKG/DEBIAN/postrm"

# 4. construction
mkdir -p "$ROOT/dist"
dpkg-deb --build --root-owner-group "$PKG" "$ROOT/dist/"
