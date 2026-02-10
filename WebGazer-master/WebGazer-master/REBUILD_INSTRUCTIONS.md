# Instructions pour recompiler WebGazer après modification

## Problème
Après avoir ajouté l'import du module `pupil` dans `src/index.mjs`, il faut recompiler WebGazer pour que les changements soient pris en compte.

## Solution

### Option 1 : Utiliser npm (recommandé)

1. Ouvrez un terminal (PowerShell ou CMD) dans le dossier WebGazer :
   ```
   cd "C:\ECOLE\Projet G1-G2\Projet eyes-tracking\WebGazer-master\WebGazer-master"
   ```

2. Si vous avez un problème de politique d'exécution PowerShell, exécutez d'abord :
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Compilez WebGazer :
   ```bash
   npm run build
   ```

   Ou en mode développement (plus rapide, moins optimisé) :
   ```bash
   npm run dev
   ```

### Option 2 : Utiliser npx (si npm ne fonctionne pas)

```bash
npx webpack --progress --config webpack.config.js --mode production
```

### Option 3 : Utiliser CMD au lieu de PowerShell

Si PowerShell bloque npm, utilisez CMD (Invite de commandes) :
1. Ouvrez CMD
2. Naviguez vers le dossier :
   ```
   cd "C:\ECOLE\Projet G1-G2\Projet eyes-tracking\WebGazer-master\WebGazer-master"
   ```
3. Exécutez :
   ```
   npm run build
   ```

## Vérification

Après la compilation, les fichiers suivants devraient être mis à jour :
- `dist/webgazer.js`
- `dist/webgazer.js.map`
- `www/webgazer.js` (copié automatiquement)
- `www/webgazer.js.map` (copié automatiquement)
- `www/data/src/webgazer.js` (copié automatiquement)
- `www/data/src/webgazer.js.map` (copié automatiquement)

## Après la compilation

1. Rechargez votre page web dans le navigateur (Ctrl+F5 pour forcer le rechargement)
2. Vérifiez la console du navigateur pour voir si `webgazer.pupil.getPupils` est maintenant disponible
3. Testez la capture de nouveaux échantillons avec les pupilles

## Note importante

Si vous modifiez `src/index.mjs` ou d'autres fichiers dans `src/`, vous devez recompiler pour que les changements soient pris en compte dans les fichiers `dist/` et `www/`.



