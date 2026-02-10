/**
 * Version fusionnée corrigée :
 * - Interface complète
 * - Capture au clic
 * - Envoi vers serveur Python
 * - Ignore le clic sur "Start"
 */

class FaceLandmarksExporter {
    constructor() {
        this.landmarksData = [];
        this.isRecording = false;
        this.ignoreNextClick = false; // 👈 pour ignorer le premier clic après Start
        this.captureScreenshot = false; // 👈 pour activer/désactiver la capture d'écran
        this.currentTargetPoint = null; // Point actuel à regarder
        this.pointRadius = 5; // Rayon du point (beaucoup plus petit)
        this.targetOverlay = null; // Overlay pour afficher les points
        this.sessionBaseName = null; // Nom de base pour les fichiers (JSON + images)
        this.imageCounter = 0; // Compteur d'images capturées dans cette session
        this.capturedImages = []; // Stocker les images capturées pour le ZIP
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }

    /**
     * Génère un nouveau point aléatoire sur l'écran
     */
    generateNextRandomPoint() {
        const margin = 50; // Marge pour éviter les bords
        const x = margin + Math.random() * (window.innerWidth - 2 * margin);
        const y = margin + Math.random() * (window.innerHeight - 2 * margin);
        
        this.currentTargetPoint = { x, y };
        this.drawTargetPoint();
        console.log(`🎯 Nouveau point à cliquer: (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }

    /**
     * Dessine le point cible actuel sur l'écran (très petit)
     */
    drawTargetPoint() {
        // Supprimer l'overlay existant s'il existe
        if (this.targetOverlay) {
            this.targetOverlay.remove();
        }

        if (!this.currentTargetPoint) {
            return;
        }

        // Créer un canvas overlay pour le point
        this.targetOverlay = document.createElement('canvas');
        this.targetOverlay.id = 'targetPointsOverlay';
        this.targetOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
        `;
        this.targetOverlay.width = window.innerWidth;
        this.targetOverlay.height = window.innerHeight;
        document.body.appendChild(this.targetOverlay);

        const ctx = this.targetOverlay.getContext('2d');
        const point = this.currentTargetPoint;

        // Point très petit (rouge)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.pointRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Petit cercle extérieur pour visibilité
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.pointRadius + 2, 0, 2 * Math.PI);
        ctx.stroke();
    }

    /**
     * Gère l'appui sur la touche Enter pour capturer
     * @param {KeyboardEvent} event - Événement clavier
     */
    async handleKeyPress(event) {
        // Vérifier si c'est la touche Enter
        if (event.key !== 'Enter' && event.keyCode !== 13) {
            return;
        }

        // Empêcher le comportement par défaut (soumission de formulaire, etc.)
        event.preventDefault();

        if (!this.isRecording) {
            return;
        }

        // Capturer l'échantillon
        await this.captureSample();
    }

    /**
     * Capture un échantillon (landmarks + pupilles)
     */
    async captureSample() {
        try {
            if (!window.webgazer || !window.webgazer.getTracker) return;
            const tracker = window.webgazer.getTracker();
            if (!tracker || !tracker.getPositions) return;

            const positions = tracker.getPositions();
            if (!positions || positions.length !== 468) return;

            // Obtenir les positions des pupilles
            const { pupil_left, pupil_right } = await this.getPupilPositions();

            // Utiliser la position du point cible comme gaze_prediction
            const targetX = this.currentTargetPoint ? this.currentTargetPoint.x : 0;
            const targetY = this.currentTargetPoint ? this.currentTargetPoint.y : 0;

            const sample = {
                timestamp: new Date().toISOString(),
                landmarks: positions.map(pos => [pos[0], pos[1], pos[2] || 0]),
                pupil_left: pupil_left,
                pupil_right: pupil_right,
                gaze_prediction: [targetX, targetY], // Position du point regardé
                metadata: {
                    user_agent: navigator.userAgent,
                    screen_resolution: [screen.width, screen.height],
                    window_size: [window.innerWidth, window.innerHeight]
                }
            };

            this.landmarksData.push(sample);
            
            const pupilInfo = [];
            if (pupil_left) pupilInfo.push("gauche");
            if (pupil_right) pupilInfo.push("droite");
            const pupilStatus = pupilInfo.length > 0 ? ` avec pupille(s) ${pupilInfo.join(" et ")}` : " (pupilles non détectées)";
            
            console.log(`📸 Capture #${this.landmarksData.length} au point (${targetX.toFixed(0)}, ${targetY.toFixed(0)})${pupilStatus}`);

            // Capture d'écran seulement si activée
            if (this.captureScreenshot) {
                this.imageCounter++; // Incrémenter le compteur avant la capture
                this.captureHeadOnly();
            }

            // Générer un nouveau point aléatoire pour le prochain échantillon
            if (this.isRecording) {
                this.generateNextRandomPoint();
            }
        } catch (error) {
            console.error("❌ Erreur lors de la capture:", error);
        }
    }

    startRecording() {
        if (this.isRecording) {
            console.log("⚠️ Enregistrement déjà en cours");
            return;
        }
        this.isRecording = true;
        this.landmarksData = [];
        this.imageCounter = 0; // Réinitialiser le compteur d'images
        this.capturedImages = []; // Réinitialiser le tableau d'images
        
        // Générer un nom de base pour cette session (même format que le JSON)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.sessionBaseName = `face_landmarks_${timestamp}`;
        
        // Générer le premier point aléatoire
        this.generateNextRandomPoint();
        
        // Écouter la touche Enter au lieu des clics
        document.addEventListener('keydown', this.handleKeyPress);
        console.log("🎬 Enregistrement démarré — Regardez le point rouge et appuyez sur ENTER pour capturer");
        console.log(`📁 Nom de session: ${this.sessionBaseName}`);
    }

    stopRecording() {
        if (!this.isRecording) {
            console.log("⚠️ Aucun enregistrement en cours");
            return;
        }
        this.isRecording = false;
        document.removeEventListener('keydown', this.handleKeyPress);
        
        // Supprimer l'overlay des points
        if (this.targetOverlay) {
            this.targetOverlay.remove();
            this.targetOverlay = null;
        }
        
        this.currentTargetPoint = null;
        
        console.log(`🛑 Arrêté — ${this.landmarksData.length} échantillons capturés`);
    }

    /**
     * Convertit la position de la pupille du patch de l'œil vers les coordonnées du canvas (pixels)
     * Les landmarks MediaPipe sont en pixels, donc les pupilles doivent aussi être en pixels
     * @param {Object} eyePatch - Objet contenant les informations du patch de l'œil
     * @param {Array} pupilPosition - Position de la pupille dans le patch [x, y]
     * @returns {Array|null} Position en pixels [x, y] ou null si invalide
     */
    convertPupilToCanvas(eyePatch, pupilPosition) {
        if (!eyePatch || !pupilPosition || !Array.isArray(pupilPosition) || pupilPosition.length < 2) {
            return null;
        }

        try {
            // Position dans le patch (coordonnées locales)
            const patchX = pupilPosition[0];
            const patchY = pupilPosition[1];

            // Position dans le canvas (pixels)
            // imagex et imagey sont les coordonnées du coin supérieur gauche du patch dans le canvas
            const canvasX = (eyePatch.imagex || 0) + patchX;
            const canvasY = (eyePatch.imagey || 0) + patchY;

            // Retourner en pixels (même base que les landmarks MediaPipe)
            return [canvasX, canvasY];
        } catch (error) {
            console.error("❌ Erreur lors de la conversion de la pupille:", error);
            return null;
        }
    }

    /**
     * Obtient les positions des pupilles depuis WebGazer
     * @returns {Promise<Object>} Objet avec pupil_left et pupil_right (ou null)
     */
    /**
     * Détecte une pupille dans un patch d'œil (implémentation simplifiée de getSinglePupil)
     * Basé sur pupil.mjs de WebGazer
     */
    detectPupilInPatch(patchData, width, height) {
        try {
            // Convertir en niveaux de gris si nécessaire
            let pixels;
            if (window.webgazer && window.webgazer.util && window.webgazer.util.grayscale) {
                pixels = Array.prototype.slice.call(window.webgazer.util.grayscale(patchData, width, height));
            } else {
                // Fallback: conversion simple en niveaux de gris
                pixels = [];
                for (let i = 0; i < patchData.length; i += 4) {
                    const gray = 0.299 * patchData[i] + 0.587 * patchData[i + 1] + 0.114 * patchData[i + 2];
                    pixels.push(gray);
                }
            }

            // Algorithme simplifié de détection de pupille
            // Trouver la zone la plus sombre (la pupille est généralement la zone la plus sombre)
            let minIntensity = 255;
            let minX = width / 2;
            let minY = height / 2;

            for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.8); y++) {
                for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x++) {
                    const idx = y * width + x;
                    if (idx < pixels.length) {
                        const intensity = pixels[idx];
                        if (intensity < minIntensity) {
                            minIntensity = intensity;
                            minX = x;
                            minY = y;
                        }
                    }
                }
            }

            // Retourner la position de la pupille dans le patch
            return [minX, minY];
        } catch (error) {
            console.error("Erreur lors de la détection de pupille:", error);
            return null;
        }
    }

    async getPupilPositions() {
        try {
            // Obtenir la prédiction actuelle de WebGazer qui contient les eye features
            const prediction = await window.webgazer.getCurrentPrediction();
            
            if (!prediction || !prediction.eyeFeatures) {
                console.warn("⚠️ Pas de eyeFeatures dans la prédiction");
                return { pupil_left: null, pupil_right: null };
            }

            const eyeFeatures = prediction.eyeFeatures;
            
            // Vérifier que les eye patches existent
            if (!eyeFeatures.left || !eyeFeatures.right) {
                console.warn("⚠️ Eye patches manquants");
                return { pupil_left: null, pupil_right: null };
            }

            // Détecter les pupilles directement dans les patches
            // Note: On doit d'abord vérifier si getPupils est disponible via webgazer.pupil
            // Sinon, on utilise notre propre implémentation
            let pupilLeft = null;
            let pupilRight = null;

            // Essayer d'utiliser getPupils de WebGazer si disponible
            if (window.webgazer && window.webgazer.pupil && window.webgazer.pupil.getPupils) {
                try {
                    window.webgazer.pupil.getPupils(eyeFeatures);
                } catch (e) {
                    console.warn("⚠️ Erreur lors de l'appel à getPupils:", e);
                }
            }

            // Détecter la pupille gauche
            if (eyeFeatures.left && !eyeFeatures.left.blink) {
                if (eyeFeatures.left.pupil && Array.isArray(eyeFeatures.left.pupil[0])) {
                    // Pupille déjà détectée par getPupils
                    const pupilPos = eyeFeatures.left.pupil[0];
                    pupilLeft = this.convertPupilToCanvas(eyeFeatures.left, pupilPos);
                } else if (eyeFeatures.left.patch && eyeFeatures.left.patch.data) {
                    // Détecter manuellement
                    const pupilPos = this.detectPupilInPatch(
                        eyeFeatures.left.patch.data,
                        eyeFeatures.left.width,
                        eyeFeatures.left.height
                    );
                    if (pupilPos) {
                        pupilLeft = this.convertPupilToCanvas(eyeFeatures.left, pupilPos);
                    }
                }
            }

            // Détecter la pupille droite
            if (eyeFeatures.right && !eyeFeatures.right.blink) {
                if (eyeFeatures.right.pupil && Array.isArray(eyeFeatures.right.pupil[0])) {
                    // Pupille déjà détectée par getPupils
                    const pupilPos = eyeFeatures.right.pupil[0];
                    pupilRight = this.convertPupilToCanvas(eyeFeatures.right, pupilPos);
                } else if (eyeFeatures.right.patch && eyeFeatures.right.patch.data) {
                    // Détecter manuellement
                    const pupilPos = this.detectPupilInPatch(
                        eyeFeatures.right.patch.data,
                        eyeFeatures.right.width,
                        eyeFeatures.right.height
                    );
                    if (pupilPos) {
                        pupilRight = this.convertPupilToCanvas(eyeFeatures.right, pupilPos);
                    }
                }
            }

            return { pupil_left: pupilLeft, pupil_right: pupilRight };
        } catch (error) {
            console.error("❌ Erreur lors de la récupération des pupilles:", error);
            return { pupil_left: null, pupil_right: null };
        }
    }

    /**
     * Capture l'image de la caméra (juste la tête, sans annotations)
     * @returns {HTMLCanvasElement|null} Canvas avec l'image capturée
     */
    captureHeadOnly() {
        try {
            // Méthode 1: Utiliser getVideoElementCanvas() de WebGazer (méthode recommandée)
            let sourceElement = null;
            let sourceWidth = 640;
            let sourceHeight = 480;

            if (window.webgazer && window.webgazer.getVideoElementCanvas) {
                const webgazerCanvas = window.webgazer.getVideoElementCanvas();
                if (webgazerCanvas && webgazerCanvas.width > 0 && webgazerCanvas.height > 0) {
                    sourceElement = webgazerCanvas;
                    sourceWidth = webgazerCanvas.width;
                    sourceHeight = webgazerCanvas.height;
                    console.log(`📷 Utilisation du canvas WebGazer: ${sourceWidth}x${sourceHeight}`);
                }
            }

            // Méthode 2: Chercher le canvas par ID
            if (!sourceElement) {
                const canvasById = document.getElementById('webgazerVideoCanvas') || 
                                   document.getElementById('webgazerVideoFeed');
                if (canvasById && canvasById.width > 0 && canvasById.height > 0) {
                    sourceElement = canvasById;
                    sourceWidth = canvasById.width;
                    sourceHeight = canvasById.height;
                    console.log(`📷 Utilisation du canvas par ID: ${sourceWidth}x${sourceHeight}`);
                }
            }

            // Méthode 3: Chercher l'élément vidéo
            if (!sourceElement) {
                const videoElement = document.getElementById('webgazerVideoFeed') || 
                                     document.querySelector('video');
                if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    sourceElement = videoElement;
                    sourceWidth = videoElement.videoWidth;
                    sourceHeight = videoElement.videoHeight;
                    console.log(`📷 Utilisation de l'élément vidéo: ${sourceWidth}x${sourceHeight}`);
                }
            }

            // Méthode 4: Chercher n'importe quel canvas visible
            if (!sourceElement) {
                const allCanvases = document.querySelectorAll('canvas');
                for (let canvas of allCanvases) {
                    if (canvas.width > 0 && canvas.height > 0 && 
                        canvas.style.display !== 'none' && 
                        canvas.style.visibility !== 'hidden') {
                        sourceElement = canvas;
                        sourceWidth = canvas.width;
                        sourceHeight = canvas.height;
                        console.log(`📷 Utilisation d'un canvas trouvé: ${sourceWidth}x${sourceHeight}`);
                        break;
                    }
                }
            }

            if (!sourceElement) {
                console.error("❌ Impossible de trouver la source vidéo pour la capture");
                console.log("Éléments disponibles:", {
                    webgazer: !!window.webgazer,
                    getVideoElementCanvas: !!(window.webgazer && window.webgazer.getVideoElementCanvas),
                    videoElements: document.querySelectorAll('video').length,
                    canvasElements: document.querySelectorAll('canvas').length
                });
                return null;
            }

            // Créer un canvas pour la capture
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = sourceWidth;
            captureCanvas.height = sourceHeight;
            const ctx = captureCanvas.getContext('2d');

            // Dessiner l'image source sur le canvas de capture
            try {
                ctx.drawImage(sourceElement, 0, 0, sourceWidth, sourceHeight);
            } catch (drawError) {
                console.error("❌ Erreur lors du dessin de l'image:", drawError);
                return null;
            }

            // Vérifier que le canvas contient bien des données
            const imageData = ctx.getImageData(0, 0, 1, 1);
            if (!imageData || imageData.data[3] === 0) {
                console.warn("⚠️ Le canvas semble vide");
            }

            // Télécharger l'image avec le nom de session + numéro
            try {
                const dataURL = captureCanvas.toDataURL('image/png');
                if (!dataURL || dataURL === 'data:,') {
                    console.error("❌ Impossible de générer l'image");
                    return null;
                }

                // Utiliser le nom de session + numéro d'image (3 chiffres avec zéros devant)
                const imageNumber = String(this.imageCounter).padStart(3, '0');
                const filename = this.sessionBaseName 
                    ? `${this.sessionBaseName}_${imageNumber}.png`
                    : `head_capture_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

                // Stocker l'image pour le ZIP (convertir dataURL en bytes)
                const base64Data = dataURL.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                this.capturedImages.push({
                    filename: filename,
                    data: bytes,
                    width: sourceWidth,
                    height: sourceHeight
                });

                // Ne pas télécharger individuellement - seulement dans le ZIP
                console.log(`✅ Image capturée et stockée: ${filename} (${sourceWidth}x${sourceHeight}) - Sera incluse dans le ZIP`);
                return captureCanvas;
            } catch (downloadError) {
                console.error("❌ Erreur lors du téléchargement:", downloadError);
                return null;
            }
        } catch (error) {
            console.error("❌ Erreur lors de la capture d'image:", error);
            return null;
        }
    }

    /**
     * Capture l'image de la caméra et dessine les pupilles dessus pour vérification
     * @param {Array} pupilLeft - Position de la pupille gauche [x, y] en pixels
     * @param {Array} pupilRight - Position de la pupille droite [x, y] en pixels
     */
    captureAndDrawPupils(pupilLeft, pupilRight) {
        try {
            // Trouver l'élément vidéo ou canvas de la caméra
            let videoElement = document.querySelector('video');
            let canvasElement = null;
            
            // Chercher le canvas vidéo de WebGazer
            const webgazerCanvas = document.getElementById('webgazerVideoFeed') || 
                                   document.querySelector('canvas[id*="video"]') ||
                                   document.querySelector('canvas');
            
            if (webgazerCanvas) {
                canvasElement = webgazerCanvas;
            }

            // Créer un canvas pour la capture
            const captureCanvas = document.createElement('canvas');
            const ctx = captureCanvas.getContext('2d');

            if (canvasElement) {
                // Utiliser le canvas existant
                captureCanvas.width = canvasElement.width || 640;
                captureCanvas.height = canvasElement.height || 480;
                ctx.drawImage(canvasElement, 0, 0);
            } else if (videoElement && videoElement.videoWidth > 0) {
                // Utiliser l'élément vidéo
                captureCanvas.width = videoElement.videoWidth;
                captureCanvas.height = videoElement.videoHeight;
                ctx.drawImage(videoElement, 0, 0);
            } else {
                console.warn("⚠️ Impossible de trouver la source vidéo pour la capture");
                return null;
            }

            // Dessiner les pupilles sur l'image
            ctx.strokeStyle = '#00FF00'; // Vert pour les pupilles
            ctx.fillStyle = '#00FF00';
            ctx.lineWidth = 3;

            // Dessiner la pupille gauche
            if (pupilLeft && Array.isArray(pupilLeft) && pupilLeft.length >= 2) {
                const x = pupilLeft[0];
                const y = pupilLeft[1];
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                // Ajouter un label
                ctx.fillStyle = '#00FF00';
                ctx.font = '16px Arial';
                ctx.fillText('Pupille Gauche', x + 10, y - 10);
            }

            // Dessiner la pupille droite
            if (pupilRight && Array.isArray(pupilRight) && pupilRight.length >= 2) {
                const x = pupilRight[0];
                const y = pupilRight[1];
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                // Ajouter un label
                ctx.fillStyle = '#00FF00';
                ctx.font = '16px Arial';
                ctx.fillText('Pupille Droite', x + 10, y - 10);
            }

            // Convertir en image et l'afficher
            const img = new Image();
            img.src = captureCanvas.toDataURL('image/png');
            
            // Créer une fenêtre popup pour afficher l'image
            const popup = window.open('', 'PupilVerification', 'width=800,height=600');
            if (popup) {
                popup.document.write(`
                    <html>
                        <head><title>Vérification des Pupilles - Capture #${this.landmarksData.length}</title></head>
                        <body style="margin:0; padding:20px; background:#000; color:#fff; font-family:monospace;">
                            <h2>Vérification des Pupilles - Capture #${this.landmarksData.length}</h2>
                            <p>Pupille gauche: ${pupilLeft ? `(${pupilLeft[0].toFixed(1)}, ${pupilLeft[1].toFixed(1)})` : 'Non détectée'}</p>
                            <p>Pupille droite: ${pupilRight ? `(${pupilRight[0].toFixed(1)}, ${pupilRight[1].toFixed(1)})` : 'Non détectée'}</p>
                            <img src="${img.src}" style="max-width:100%; border:2px solid #00FF00;" />
                            <br/><br/>
                            <button onclick="window.print()">Imprimer</button>
                            <button onclick="window.close()">Fermer</button>
                        </body>
                    </html>
                `);
                popup.document.close();
            }

            // Télécharger aussi l'image
            const link = document.createElement('a');
            link.download = `pupil_verification_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            link.href = captureCanvas.toDataURL('image/png');
            link.click();

            console.log("✅ Image de vérification capturée et affichée");
            return captureCanvas;
        } catch (error) {
            console.error("❌ Erreur lors de la capture d'image:", error);
            return null;
        }
    }


    async exportToPythonServer(url = 'http://localhost:5000/receive_landmarks') {
        if (this.landmarksData.length === 0) {
            console.log("❌ Aucune donnée à envoyer");
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    landmarks_data: this.landmarksData,
                    metadata: {
                        export_timestamp: new Date().toISOString(),
                        total_samples: this.landmarksData.length,
                        export_type: "click_based_with_pupils"
                    }
                })
            });

            const result = await response.json();
            console.log("✅ Données envoyées au serveur Python:", result);
            
            if (result.pupil_info) {
                console.log(`📊 Pupilles détectées: gauche=${result.pupil_info.pupil_left_added}, droite=${result.pupil_info.pupil_right_added}`);
                console.log(`📊 Total landmarks par échantillon: ${result.pupil_info.total_landmarks_per_sample}`);
            }
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi:", error);
        }
    }

    /**
     * Charge JSZip depuis CDN si pas déjà disponible
     */
    async loadJSZip() {
        if (window.JSZip) {
            return window.JSZip;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('Impossible de charger JSZip'));
            document.head.appendChild(script);
        });
    }

    /**
     * Crée un ZIP avec le JSON et toutes les images
     */
    async exportToZIP() {
        if (this.landmarksData.length === 0) {
            console.log("❌ Rien à exporter");
            return;
        }

        try {
            // Charger JSZip
            const JSZip = await this.loadJSZip();
            const zip = new JSZip();

            // Utiliser le nom de session si disponible
            const baseName = this.sessionBaseName 
                ? this.sessionBaseName
                : `face_landmarks_${new Date().toISOString().replace(/[:.]/g, '-')}`;

            // Ajouter le JSON
            const jsonContent = JSON.stringify(this.landmarksData, null, 2);
            zip.file(`${baseName}.json`, jsonContent);

            // Ajouter toutes les images capturées
            if (this.capturedImages.length > 0) {
                this.capturedImages.forEach(image => {
                    zip.file(image.filename, image.data);
                });
                console.log(`📦 ${this.capturedImages.length} image(s) ajoutée(s) au ZIP`);
            } else {
                console.log("⚠️ Aucune image capturée à ajouter au ZIP");
            }

            // Générer le ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Télécharger le ZIP
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${baseName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            console.log(`✅ ZIP exporté : ${baseName}.zip (${this.landmarksData.length} échantillons, ${this.capturedImages.length} images)`);
        } catch (error) {
            console.error("❌ Erreur lors de la création du ZIP:", error);
            // Fallback: exporter juste le JSON
            this.exportToJSON();
        }
    }

    exportToJSON() {
        if (this.landmarksData.length === 0) return console.log("❌ Rien à exporter");
        
        // Utiliser le nom de session si disponible, sinon générer un nouveau nom
        const name = this.sessionBaseName 
            ? `${this.sessionBaseName}.json`
            : `face_landmarks_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const blob = new Blob([JSON.stringify(this.landmarksData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        console.log(`✅ Fichier exporté : ${name}`);
    }

    clearData() {
        this.landmarksData = [];
        console.log("🗑️ Données effacées");
    }
}

// === Interface minimale ===
function createExportUI() {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 10px; right: 10px;
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 8px;
        font-family: monospace;
        border-radius: 8px;
        z-index: 9999;
    `;
    div.innerHTML = `
        <button id="start">▶ Start</button>
        <button id="stop">⏹ Stop</button>
        <button id="send">📡 Send</button>
        <button id="save">💾 Save</button>
        <button id="clear">🗑️ Clear</button>
        <button id="toggleScreenshot" style="margin-top:4px;font-size:10px;padding:2px 4px;">📷 Capture: OFF</button>
        <div id="status" style="margin-top:4px;font-size:11px;">Ready</div>
    `;
    document.body.appendChild(div);

    const exporter = new FaceLandmarksExporter();
    const status = div.querySelector('#status');

    div.querySelector('#start').onclick = () => { 
        exporter.startRecording(); 
        status.textContent = "Recording... Regardez le point et appuyez sur ENTER"; 
    };
    div.querySelector('#stop').onclick = () => { 
        exporter.stopRecording(); 
        status.textContent = `Stopped (${exporter.landmarksData.length} samples)`; 
    };
    div.querySelector('#send').onclick = async () => {
        await exporter.exportToPythonServer();
        status.textContent = "Sent to server!";
    };
    div.querySelector('#save').onclick = async () => {
        await exporter.exportToZIP();
        status.textContent = "ZIP créé avec JSON + images!";
    };
    div.querySelector('#clear').onclick = () => { exporter.clearData(); status.textContent = "Cleared"; };
    
    // Bouton toggle pour la capture d'écran
    const toggleScreenshotBtn = div.querySelector('#toggleScreenshot');
    toggleScreenshotBtn.onclick = () => {
        exporter.captureScreenshot = !exporter.captureScreenshot;
        toggleScreenshotBtn.textContent = `📷 Capture: ${exporter.captureScreenshot ? 'ON' : 'OFF'}`;
        toggleScreenshotBtn.style.background = exporter.captureScreenshot ? '#4CAF50' : '#666';
        status.textContent = `Capture d'écran: ${exporter.captureScreenshot ? 'Activée (tête seule)' : 'Désactivée'}`;
    };
}

// auto init
window.addEventListener('load', () => {
    if (window.webgazer) {
        createExportUI();
        console.log("🎯 Interface de capture initialisée");
    } else {
        console.warn("⚠️ WebGazer non détecté !");
    }
});
