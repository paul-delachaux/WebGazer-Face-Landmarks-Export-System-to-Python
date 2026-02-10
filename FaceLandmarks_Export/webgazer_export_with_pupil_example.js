/**
 * EXEMPLE de modification de webgazer_export.js pour inclure les positions des pupilles
 * 
 * Ce fichier montre comment modifier handleClick() pour obtenir et envoyer
 * les positions des pupilles au serveur Python.
 * 
 * IMPORTANT: Ceci est un exemple. Vous devez adapter le code selon votre
 * configuration WebGazer et la façon dont vous accédez aux eye patches.
 */

class FaceLandmarksExporter {
    constructor() {
        this.landmarksData = [];
        this.isRecording = false;
        this.handleClick = this.handleClick.bind(this);
    }

    startRecording() {
        if (this.isRecording) {
            console.log("⚠️ Enregistrement déjà en cours");
            return;
        }

        this.isRecording = true;
        this.landmarksData = [];
        document.addEventListener('click', this.handleClick);
        console.log("🎬 Enregistrement démarré — cliquez pour capturer un échantillon");
    }

    stopRecording() {
        if (!this.isRecording) {
            console.log("⚠️ Aucun enregistrement en cours");
            return;
        }

        this.isRecording = false;
        document.removeEventListener('click', this.handleClick);
        console.log(`🛑 Arrêté — ${this.landmarksData.length} échantillons capturés`);
    }

    /**
     * Convertit la position de la pupille du patch de l'œil vers les coordonnées normalisées du canvas
     * @param {Object} eyePatch - Objet contenant les informations du patch de l'œil
     * @param {Array} pupilPosition - Position de la pupille dans le patch [x, y]
     * @param {Number} canvasWidth - Largeur du canvas
     * @param {Number} canvasHeight - Hauteur du canvas
     * @returns {Array|null} Position normalisée [x, y] ou null si invalide
     */
    convertPupilToNormalized(eyePatch, pupilPosition, canvasWidth, canvasHeight) {
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

            // Position normalisée (0.0 à 1.0) - même base que les landmarks MediaPipe
            const normalizedX = canvasX / canvasWidth;
            const normalizedY = canvasY / canvasHeight;

            return [normalizedX, normalizedY];
        } catch (error) {
            console.error("❌ Erreur lors de la conversion de la pupille:", error);
            return null;
        }
    }

    /**
     * Obtient les positions des pupilles depuis WebGazer
     * @returns {Promise<Object>} Objet avec pupil_left et pupil_right (ou null)
     */
    async getPupilPositions() {
        try {
            // Obtenir la prédiction actuelle de WebGazer qui contient les eye features
            const prediction = await window.webgazer.getCurrentPrediction();
            
            if (!prediction || !prediction.eyeFeatures) {
                return { pupil_left: null, pupil_right: null };
            }

            const eyeFeatures = prediction.eyeFeatures;
            const canvas = document.getElementById('webgazerVideoFeed'); // ⚠️ Adaptez selon votre ID de canvas
            
            if (!canvas) {
                console.warn("⚠️ Canvas non trouvé pour la conversion des pupilles");
                return { pupil_left: null, pupil_right: null };
            }

            const canvasWidth = canvas.width || canvas.clientWidth;
            const canvasHeight = canvas.height || canvas.clientHeight;

            let pupilLeft = null;
            let pupilRight = null;

            // Obtenir les pupilles depuis les eye patches
            // Note: Les pupilles doivent être détectées via getPupils() avant
            if (eyeFeatures.left && eyeFeatures.left.pupil && !eyeFeatures.left.blink) {
                // eyeFeatures.left.pupil est au format [[x, y], halfWidth]
                const pupilPos = eyeFeatures.left.pupil[0];
                pupilLeft = this.convertPupilToNormalized(
                    eyeFeatures.left,
                    pupilPos,
                    canvasWidth,
                    canvasHeight
                );
            }

            if (eyeFeatures.right && eyeFeatures.right.pupil && !eyeFeatures.right.blink) {
                const pupilPos = eyeFeatures.right.pupil[0];
                pupilRight = this.convertPupilToNormalized(
                    eyeFeatures.right,
                    pupilPos,
                    canvasWidth,
                    canvasHeight
                );
            }

            return { pupil_left: pupilLeft, pupil_right: pupilRight };
        } catch (error) {
            console.error("❌ Erreur lors de la récupération des pupilles:", error);
            return { pupil_left: null, pupil_right: null };
        }
    }

    /**
     * Fonction appelée à chaque clic - MODIFIÉE pour inclure les pupilles
     */
    async handleClick(event) {
        try {
            if (!window.webgazer || !window.webgazer.getTracker) return;
            const tracker = window.webgazer.getTracker();
            if (!tracker || !tracker.getPositions) return;

            const positions = tracker.getPositions();
            if (!positions || positions.length !== 468) return;

            // Coordonnées du clic dans la fenêtre
            const clickX = event.clientX;
            const clickY = event.clientY;

            // ⭐ NOUVEAU: Obtenir les positions des pupilles
            const { pupil_left, pupil_right } = await this.getPupilPositions();

            // Création d'un échantillon avec les pupilles
            const sample = {
                timestamp: new Date().toISOString(),
                landmarks: positions.map(pos => [pos[0], pos[1], pos[2] || 0]),
                pupil_left: pupil_left,  // ⭐ NOUVEAU: Position pupille gauche [x, y] normalisée
                pupil_right: pupil_right, // ⭐ NOUVEAU: Position pupille droite [x, y] normalisée
                gaze_prediction: [clickX, clickY],
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
            
            console.log(`📸 Capture #${this.landmarksData.length} à (${clickX}, ${clickY})${pupilStatus}`);

        } catch (error) {
            console.error("❌ Erreur lors de la capture:", error);
        }
    }

    /**
     * Export manuel vers JSON
     */
    exportToJSON(filename = null) {
        if (this.landmarksData.length === 0) {
            console.log("❌ Aucune donnée à exporter");
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = filename || `face_landmarks_with_pupil_${timestamp}.json`;

        const dataStr = JSON.stringify(this.landmarksData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = finalFilename;
        link.click();

        console.log(`✅ ${this.landmarksData.length} échantillons exportés → ${finalFilename}`);
    }

    /**
     * Export vers le serveur Python avec pupilles
     */
    async exportToPythonServer(url = 'http://localhost:5000/receive_landmarks') {
        if (this.landmarksData.length === 0) {
            console.log("❌ Aucune donnée à exporter");
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

    clearData() {
        this.landmarksData = [];
        console.log("🗑️ Données effacées");
    }
}

// ⚠️ NOTES IMPORTANTES:
//
// 1. Assurez-vous que WebGazer détecte les pupilles avant d'appeler handleClick
//    Vous devrez peut-être appeler webgazer.pupil.getPupils() quelque part dans votre code
//
// 2. Adaptez l'ID du canvas selon votre configuration:
//    const canvas = document.getElementById('webgazerVideoFeed');
//
// 3. Les coordonnées des pupilles doivent être dans la même base que les landmarks
//    (normalisées entre 0.0 et 1.0)
//
// 4. Si les pupilles ne sont pas détectées, le serveur Python ajoutera des points par défaut [0, 0, 0]
//
// 5. Pour utiliser ce code, remplacez la méthode handleClick() dans votre webgazer_export.js
//    par la version modifiée ci-dessus


