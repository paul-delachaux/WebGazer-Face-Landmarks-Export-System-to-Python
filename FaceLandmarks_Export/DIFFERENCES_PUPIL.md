# 📊 Différences entre `python_server.py` et `python_server_with_pupil.py`

## 🎯 Vue d'ensemble

Le script `python_server_with_pupil.py` est une version modifiée de `python_server.py` qui ajoute automatiquement les positions des pupilles (gauche et droite) comme points supplémentaires dans les landmarks faciaux.

## 🔍 Principales différences

### 1. **Fichier de sortie**
- **Ancien script** : `face_landmarks_dataset.json`
- **Nouveau script** : `face_landmarks_dataset_with_pupil.json`

### 2. **Structure des landmarks**

#### Ancien script (`python_server.py`)
```json
{
  "landmarks": [
    [x1, y1, z1],
    [x2, y2, z2],
    ...
    [x468, y468, z468]  // 468 points MediaPipe
  ]
}
```

#### Nouveau script (`python_server_with_pupil.py`)
```json
{
  "landmarks": [
    [x1, y1, z1],
    [x2, y2, z2],
    ...
    [x468, y468, z468],  // 468 points MediaPipe originaux
    [x469, y469, z469],  // Point 468: Position pupille gauche
    [x470, y470, z470]   // Point 469: Position pupille droite
  ],
  "metadata": {
    "pupil_left_added": true,
    "pupil_right_added": true,
    "total_landmarks": 470,
    "original_landmarks_count": 468
  }
}
```

### 3. **Format des données d'entrée**

Le nouveau script accepte des positions de pupilles dans les données envoyées :

```javascript
{
  "landmarks_data": [
    {
      "timestamp": "2025-01-15T14:30:25.123Z",
      "landmarks": [[x, y, z], ...],  // 468 points
      "pupil_left": [x, y] ou [x, y, z],  // ⭐ NOUVEAU: Position pupille gauche
      "pupil_right": [x, y] ou [x, y, z], // ⭐ NOUVEAU: Position pupille droite
      "gaze_prediction": [x, y],
      "metadata": {...}
    }
  ]
}
```

**Important** : Les positions de pupilles doivent être en **coordonnées normalisées (0.0 à 1.0)**, dans la même base que les landmarks du facemesh MediaPipe.

### 4. **Gestion des pupilles manquantes**

Si les positions de pupilles ne sont pas fournies :
- Le script ajoute des points par défaut `[0.0, 0.0, 0.0]`
- Un avertissement est affiché dans la console
- Le champ `pupil_left_added` ou `pupil_right_added` dans metadata sera `false`

### 5. **Nouveaux endpoints**

Le nouveau script ajoute un endpoint `/stats` pour obtenir des statistiques :

```bash
GET http://localhost:5000/stats
```

Réponse :
```json
{
  "status": "success",
  "total_samples": 100,
  "samples_with_pupils": 95,
  "average_landmarks_per_sample": 470.0,
  "landmark_count_range": {
    "min": 468,
    "max": 470
  }
}
```

### 6. **Messages de console**

Le nouveau script affiche des informations supplémentaires :
- Nombre de landmarks par échantillon après traitement
- Avertissements si les pupilles ne sont pas fournies
- Informations sur les pupilles dans la réponse JSON

## 📝 Comment utiliser le nouveau script

### 1. **Modifier le client JavaScript**

Vous devez modifier votre fichier `webgazer_export.js` pour inclure les positions des pupilles. Voici un exemple de modification :

```javascript
handleClick(event) {
    try {
        if (!window.webgazer || !window.webgazer.getTracker) return;
        const tracker = window.webgazer.getTracker();
        if (!tracker || !tracker.getPositions) return;

        const positions = tracker.getPositions();
        if (!positions || positions.length !== 468) return;

        // Obtenir les eye patches et détecter les pupilles
        const canvas = document.getElementById('webgazerVideoFeed'); // ou votre canvas
        const eyeFeatures = await webgazer.getCurrentPrediction();
        
        let pupilLeft = null;
        let pupilRight = null;
        
        if (eyeFeatures && eyeFeatures.eyeFeatures) {
            const eyes = eyeFeatures.eyeFeatures;
            
            // Obtenir les positions des pupilles depuis les eye patches
            // Note: Les positions sont dans les coordonnées du patch, 
            // il faut les convertir en coordonnées normalisées du canvas
            if (eyes.left && eyes.left.pupil) {
                // Convertir de coordonnées patch à coordonnées canvas normalisées
                const patchX = eyes.left.pupil[0][0];
                const patchY = eyes.left.pupil[0][1];
                const canvasX = (eyes.left.imagex + patchX) / canvas.width;
                const canvasY = (eyes.left.imagey + patchY) / canvas.height;
                pupilLeft = [canvasX, canvasY];
            }
            
            if (eyes.right && eyes.right.pupil) {
                const patchX = eyes.right.pupil[0][0];
                const patchY = eyes.right.pupil[0][1];
                const canvasX = (eyes.right.imagex + patchX) / canvas.width;
                const canvasY = (eyes.right.imagey + patchY) / canvas.height;
                pupilRight = [canvasX, canvasY];
            }
        }

        const clickX = event.clientX;
        const clickY = event.clientY;

        const sample = {
            timestamp: new Date().toISOString(),
            landmarks: positions.map(pos => [pos[0], pos[1], pos[2] || 0]),
            pupil_left: pupilLeft,  // ⭐ NOUVEAU
            pupil_right: pupilRight, // ⭐ NOUVEAU
            gaze_prediction: [clickX, clickY],
            metadata: {
                user_agent: navigator.userAgent,
                screen_resolution: [screen.width, screen.height],
                window_size: [window.innerWidth, window.innerHeight]
            }
        };

        this.landmarksData.push(sample);
        console.log(`📸 Capture #${this.landmarksData.length} avec pupilles`);
    } catch (error) {
        console.error("❌ Erreur lors de la capture:", error);
    }
}
```

### 2. **Lancer le nouveau serveur**

```bash
python python_server_with_pupil.py
```

### 3. **Vérifier les données**

Les données sauvegardées contiendront maintenant 470 points au lieu de 468 :
- Points 0-467 : Landmarks MediaPipe originaux
- Point 468 : Position pupille gauche
- Point 469 : Position pupille droite

## ⚠️ Points importants

1. **Coordonnées normalisées** : Les positions de pupilles doivent être dans la même base que les landmarks (0.0 à 1.0)

2. **Conversion nécessaire** : Si vous obtenez les pupilles depuis `getSinglePupil`, les coordonnées sont dans le patch de l'œil. Il faut les convertir :
   ```javascript
   // Position dans le patch
   const patchX = pupil[0][0];
   const patchY = pupil[0][1];
   
   // Position dans le canvas (pixels)
   const canvasX = eyePatch.imagex + patchX;
   const canvasY = eyePatch.imagey + patchY;
   
   // Position normalisée (0.0 à 1.0)
   const normalizedX = canvasX / canvasWidth;
   const normalizedY = canvasY / canvasHeight;
   ```

3. **Compatibilité** : Le script fonctionne même si les pupilles ne sont pas fournies (ajoute des points par défaut)

4. **Fichiers séparés** : Les deux scripts peuvent coexister et sauvegardent dans des fichiers différents

## 🔄 Migration depuis l'ancien script

Si vous voulez migrer vos données existantes :

1. Les données existantes dans `face_landmarks_dataset.json` ne seront pas modifiées
2. Le nouveau script utilise un fichier différent : `face_landmarks_dataset_with_pupil.json`
3. Vous pouvez continuer à utiliser l'ancien script en parallèle

## 📊 Exemple de données sauvegardées

```json
[
  {
    "timestamp": "2025-01-15T14:30:25.123Z",
    "landmarks": [
      [0.345, 0.512, 0.001],
      [0.350, 0.518, 0.002],
      // ... 466 autres points MediaPipe ...
      [0.678, 0.523, 0.003],
      [0.456, 0.389, 0.0],  // Point 468: Pupille gauche
      [0.567, 0.391, 0.0]   // Point 469: Pupille droite
    ],
    "gaze_prediction": [450, 320],
    "metadata": {
      "user_agent": "Mozilla/5.0...",
      "screen_resolution": [1920, 1080],
      "window_size": [1200, 800],
      "pupil_left_added": true,
      "pupil_right_added": true,
      "total_landmarks": 470,
      "original_landmarks_count": 468
    }
  }
]
```


