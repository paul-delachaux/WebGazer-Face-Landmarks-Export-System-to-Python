#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script modifié pour inclure la position de la pupille dans les face_landmarks.
Ce script accepte les positions des pupilles (gauche et droite) et les ajoute
comme points supplémentaires dans les landmarks (points 468 et 469).

IMPORTANT - Détection des pupilles côté client:
La détection des pupilles est effectuée côté client JavaScript en utilisant la fonction
getPupils() du module pupil.mjs (src/pupil.mjs). Cette fonction:
- Prend en entrée les eye patches (patches d'yeux) obtenus depuis WebGazer
- Utilise getSinglePupil() pour détecter chaque pupille dans son patch respectif
- Retourne les positions des pupilles dans les coordonnées du patch
- Les positions sont ensuite converties en coordonnées canvas (pixels) par le client

Le client JavaScript (webgazer_export.js) doit:
1. Obtenir les eye features via webgazer.getCurrentPrediction()
2. Appeler webgazer.pupil.getPupils(eyeFeatures) pour détecter les pupilles
3. Convertir les coordonnées des pupilles du patch vers le canvas
4. Envoyer pupil_left et pupil_right au serveur Python

Le serveur Python ajoute ensuite ces positions comme points supplémentaires dans les landmarks.
"""
from flask import Flask, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)
DATASET_FILE = "face_landmarks_dataset_with_pupil.json"

@app.route('/receive_landmarks', methods=['POST'])
def receive_landmarks():
    try:
        data = request.get_json()
        if not data or 'landmarks_data' not in data:
            return jsonify({'error': 'Données manquantes'}), 400

        landmarks_data = data['landmarks_data']
        metadata = data.get('metadata', {})

        # Charger l'existant
        if os.path.exists(DATASET_FILE):
            with open(DATASET_FILE, 'r', encoding='utf-8') as f:
                dataset = json.load(f)
        else:
            dataset = []

        # Traiter chaque échantillon pour ajouter les positions de pupilles
        processed_samples = []
        for sample in landmarks_data:
            # Copier l'échantillon original
            processed_sample = sample.copy()
            
            # Vérifier si les positions de pupilles sont fournies
            # Note: Ces positions sont détectées côté client via getPupils() de pupil.mjs
            # Elles peuvent être dans sample directement ou dans metadata
            pupil_left = sample.get('pupil_left', None)
            pupil_right = sample.get('pupil_right', None)
            
            # Si pas dans sample, chercher dans metadata
            if pupil_left is None or pupil_right is None:
                sample_metadata = sample.get('metadata', {})
                pupil_left = sample_metadata.get('pupil_left', None)
                pupil_right = sample_metadata.get('pupil_right', None)
            
            # Si les landmarks existent (468 points normalement)
            if 'landmarks' in processed_sample and isinstance(processed_sample['landmarks'], list):
                landmarks = processed_sample['landmarks'].copy()
                
                # Ajouter les positions de pupilles comme points supplémentaires
                # Point 468 = pupille gauche, Point 469 = pupille droite
                if pupil_left is not None:
                    # S'assurer que pupil_left est au format [x, y, z] ou [x, y]
                    if isinstance(pupil_left, list) and len(pupil_left) >= 2:
                        if len(pupil_left) == 2:
                            # Ajouter z=0 si seulement x,y fournis
                            landmarks.append([pupil_left[0], pupil_left[1], 0.0])
                        elif len(pupil_left) >= 3:
                            landmarks.append([pupil_left[0], pupil_left[1], pupil_left[2]])
                    else:
                        print(f"⚠️ Format de pupille gauche invalide: {pupil_left}")
                else:
                    # Si pas de pupille gauche, ajouter un point par défaut [0, 0, 0]
                    landmarks.append([0.0, 0.0, 0.0])
                    print("⚠️ Position de pupille gauche non fournie, point par défaut ajouté")
                
                if pupil_right is not None:
                    # S'assurer que pupil_right est au format [x, y, z] ou [x, y]
                    if isinstance(pupil_right, list) and len(pupil_right) >= 2:
                        if len(pupil_right) == 2:
                            # Ajouter z=0 si seulement x,y fournis
                            landmarks.append([pupil_right[0], pupil_right[1], 0.0])
                        elif len(pupil_right) >= 3:
                            landmarks.append([pupil_right[0], pupil_right[1], pupil_right[2]])
                    else:
                        print(f"⚠️ Format de pupille droite invalide: {pupil_right}")
                else:
                    # Si pas de pupille droite, ajouter un point par défaut [0, 0, 0]
                    landmarks.append([0.0, 0.0, 0.0])
                    print("⚠️ Position de pupille droite non fournie, point par défaut ajouté")
                
                # Mettre à jour les landmarks dans l'échantillon
                processed_sample['landmarks'] = landmarks
                
                # Ajouter des informations sur les pupilles dans metadata
                if 'metadata' not in processed_sample:
                    processed_sample['metadata'] = {}
                
                processed_sample['metadata']['pupil_left_added'] = pupil_left is not None
                processed_sample['metadata']['pupil_right_added'] = pupil_right is not None
                processed_sample['metadata']['total_landmarks'] = len(landmarks)
                processed_sample['metadata']['original_landmarks_count'] = len(sample.get('landmarks', []))
            
            processed_samples.append(processed_sample)

        # Ajouter les échantillons traités au dataset
        dataset.extend(processed_samples)

        # Sauvegarder le dataset complet
        with open(DATASET_FILE, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)

        print(f"✅ {len(processed_samples)} échantillon(s) ajouté(s). Total: {len(dataset)}")
        print(f"📊 Chaque échantillon contient maintenant {len(processed_samples[0]['landmarks']) if processed_samples else 0} points (468 originaux + 2 pupilles)")

        return jsonify({
            'status': 'success',
            'samples_received': len(processed_samples),
            'total_samples': len(dataset),
            'metadata': metadata,
            'pupil_info': {
                'pupil_left_added': any(s.get('metadata', {}).get('pupil_left_added', False) for s in processed_samples),
                'pupil_right_added': any(s.get('metadata', {}).get('pupil_right_added', False) for s in processed_samples),
                'total_landmarks_per_sample': len(processed_samples[0]['landmarks']) if processed_samples else 0
            }
        })

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/', methods=['GET'])
def index():
    return """
    <h1>🎯 Serveur d'enregistrement du dataset gaze/landmarks avec pupilles</h1>
    <p>Utilisez un clic dans votre page WebGazer pour enregistrer un point.</p>
    <p><strong>Nouveau:</strong> Ce serveur ajoute automatiquement les positions des pupilles (gauche et droite) 
    comme points supplémentaires dans les landmarks (points 468 et 469).</p>
    <h2>Format des données attendues:</h2>
    <pre>
    {
      "landmarks_data": [
        {
          "timestamp": "...",
          "landmarks": [[x, y, z], ...],  // 468 points
          "pupil_left": [x, y] ou [x, y, z],  // Optionnel
          "pupil_right": [x, y] ou [x, y, z],  // Optionnel
          "gaze_prediction": [x, y],
          "metadata": {...}
        }
      ]
    }
    </pre>
    <p><strong>Détection des pupilles:</strong> Les positions de pupilles sont détectées côté client 
    en utilisant la fonction <code>getPupils()</code> du module <code>pupil.mjs</code> (src/pupil.mjs). 
    Cette fonction utilise <code>getSinglePupil()</code> pour détecter chaque pupille dans les eye patches.</p>
    <p>Les positions de pupilles doivent être en pixels, dans la même base que les landmarks du facemesh 
    (qui sont également en pixels dans ce cas).</p>
    """


@app.route('/stats', methods=['GET'])
def stats():
    """Endpoint pour obtenir des statistiques sur le dataset"""
    try:
        if not os.path.exists(DATASET_FILE):
            return jsonify({
                'status': 'no_data',
                'message': 'Aucun dataset trouvé'
            })
        
        with open(DATASET_FILE, 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        
        if not dataset:
            return jsonify({
                'status': 'empty',
                'total_samples': 0
            })
        
        # Statistiques
        total_samples = len(dataset)
        samples_with_pupils = sum(1 for s in dataset if s.get('metadata', {}).get('pupil_left_added', False) or s.get('metadata', {}).get('pupil_right_added', False))
        
        # Compter les landmarks
        landmark_counts = [len(s.get('landmarks', [])) for s in dataset]
        avg_landmarks = sum(landmark_counts) / len(landmark_counts) if landmark_counts else 0
        
        return jsonify({
            'status': 'success',
            'total_samples': total_samples,
            'samples_with_pupils': samples_with_pupils,
            'average_landmarks_per_sample': avg_landmarks,
            'landmark_count_range': {
                'min': min(landmark_counts) if landmark_counts else 0,
                'max': max(landmark_counts) if landmark_counts else 0
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Serveur de collecte avec pupilles lancé sur http://localhost:5000")
    print("📝 Les positions de pupilles seront ajoutées comme points 468 (gauche) et 469 (droite)")
    print("📌 Note: La détection des pupilles se fait côté client via getPupils() de pupil.mjs")
    app.run(debug=True, host='0.0.0.0', port=5000)

