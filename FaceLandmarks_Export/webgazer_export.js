/**
 * Script modifié : capture les landmarks uniquement lors d’un clic souris
 * et remplace gaze_prediction par la position du curseur
 */

class FaceLandmarksExporter {
    constructor() {
        this.landmarksData = [];
        this.isRecording = false;
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Démarre la capture : écoute les clics souris
     */
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

    /**
     * Arrête la capture
     */
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
     * Fonction appelée à chaque clic
     */
    handleClick(event) {
        try {
            if (!window.webgazer || !window.webgazer.getTracker) return;
            const tracker = window.webgazer.getTracker();
            if (!tracker || !tracker.getPositions) return;

            const positions = tracker.getPositions();
            if (!positions || positions.length !== 468) return;

            // Coordonnées du clic dans la fenêtre
            const clickX = event.clientX;
            const clickY = event.clientY;

            // Création d’un échantillon
            const sample = {
                timestamp: new Date().toISOString(),
                landmarks: positions.map(pos => [pos[0], pos[1], pos[2] || 0]),
                gaze_prediction: [clickX, clickY], // 👁️ position du curseur
                metadata: {
                    user_agent: navigator.userAgent,
                    screen_resolution: [screen.width, screen.height],
                    window_size: [window.innerWidth, window.innerHeight]
                }
            };

            this.landmarksData.push(sample);
            console.log(`📸 Capture #${this.landmarksData.length} à (${clickX}, ${clickY})`);

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
        const finalFilename = filename || `face_landmarks_${timestamp}.json`;

        const dataStr = JSON.stringify(this.landmarksData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = finalFilename;
        link.click();

        console.log(`✅ ${this.landmarksData.length} échantillons exportés → ${finalFilename}`);
    }

    /**
     * Export vers le serveur Python
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
                        export_type: "click_based"
                    }
                })
            });

            const result = await response.json();
            console.log("✅ Données envoyées au serveur Python:", result);
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi:", error);
        }
    }

    clearData() {
        this.landmarksData = [];
        console.log("🗑️ Données effacées");
    }
}
