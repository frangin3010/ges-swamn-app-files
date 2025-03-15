document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale'); // Sélecteur d'échelle de temps
    const volumeChartCanvas = document.getElementById('volumeChart'); // Canvas du graphique
    const historyTableBody = document.querySelector('#historyTable tbody'); // Corps du tableau d'historique
    let chart;

    // Données factices pour les tests
    function generateFakeData() {
        return [
            { timestamp: 1717027200, volume: 0.65 }, // 30/05/2024 00:00
            { timestamp: 1717027200 + 3600, volume: 0.75 }, // +1h
            { timestamp: 1717027200 + 7200, volume: 0.80 } // +2h
        ];
    }

    let gesboxData = []; // Initialisation des données

    // Fonction pour mettre à jour le graphique
    function updateChart() {
        console.log("Appel de updateChart");
        const timeScale = timeScaleSelect.value;
        console.log("Échelle de temps sélectionnée :", timeScale);

        if (chart) {
            console.log("Destruction du graphique précédent");
            chart.destroy();
        }

        console.log("Données brutes :", gesboxData);

        const validData = gesboxData
            .filter(item => 
                typeof item.timestamp === 'number' && 
                typeof item.volume === 'number'
            )
            .sort((a, b) => a.timestamp - b.timestamp);

        console.log("Données valides :", validData);

        if (validData.length === 0) {
            console.warn("Aucune donnée valide à afficher");
            return;
        }

        const dataPoints = validData.map(item => ({
            x: item.timestamp * 1000,
            y: item.volume
        }));

        console.log("Points de données pour le graphique :", dataPoints);

        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Volume (L)',
                    data: dataPoints,
                    borderColor: 'blue',
                    fill: false,
                    pointRadius: 0,
                    hitRadius: 0
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeScale,
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'dd/MM/yyyy',
                                week: 'dd/MM/yyyy',
                                month: 'MMM yyyy',
                                year: 'yyyy'
                            },
                            tooltipFormat: 'dd/MM/yyyy HH:mm'
                        },
                        adapters: {
                            date: {
                                locale: window.frLocale
                            }
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            source: 'data'
                        },
                        title: {
                            display: true,
                            text: 'Date/Heure'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Volume d\'eau (L)'
                        }
                    }
                }
            }
        });

        console.log("Graphique mis à jour");
    }

    // Fonction pour mettre à jour le tableau d'historique
    function updateHistoryTable(data) {
        historyTableBody.innerHTML = ''; // Efface l'historique précédent

        let cumulativeVolume = 0; // Initialisation du volume cumulé

        data.forEach(item => {
            if (typeof item.volume !== 'number' || typeof item.timestamp !== 'number') {
                console.error("Données invalides :", item);
                return;
            }
            const row = historyTableBody.insertRow();
            const volumeCell = row.insertCell();
            const cumulativeVolumeCell = row.insertCell();
            const dateCell = row.insertCell();

            cumulativeVolume += item.volume; // Ajoute le volume actuel au cumulatif

            const date = new Date(item.timestamp * 1000); // Convertit le timestamp en date
            volumeCell.textContent = item.volume.toFixed(2); // Affiche le volume avec 2 décimales
            cumulativeVolumeCell.textContent = cumulativeVolume.toFixed(2); // Affiche le volume cumulé avec 2 décimales
            dateCell.textContent = date.toLocaleString(); // Formate la date en anglais par défaut
        });
    }

    // Récupération des données depuis Google Sheets
    async function fetchDataFromGoogleSheets() {
        const sheetId = "1-hUrnHF0h_8kR4lPk4OxkoJ894tNKZ3rI3z-aydpp2s"; // ID de votre feuille
        const apiKey = "AIzaSyCUZvlXiW-EvSzAc1DQ-RJk7sPw640LYAQ"; // Votre API Key
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:D100?key=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const rows = data.values.slice(1); // Ignorer la première ligne (en-têtes)

            const formattedData = rows.map(row => ({
                gesBoxId: row[0],
                volume: parseFloat(row[1]),
                timestamp: new Date(row[2]).getTime() / 1000,
                cumulativeVolume: parseFloat(row[3])
            })).filter(item => !isNaN(item.volume) && !isNaN(item.timestamp));

            gesboxData = formattedData; // Met à jour les données globales
            updateChart(); // Met à jour le graphique
            updateHistoryTable(formattedData); // Met à jour le tableau d'historique
        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    }

    // Utilisation des données factices pour tester (décommentez si nécessaire)
    // gesboxData = generateFakeData();
    // updateChart();
    // updateHistoryTable(gesboxData);

    // Appel initial pour charger les données depuis Google Sheets
    fetchDataFromGoogleSheets();

    // Gestion sécurisée du sélecteur
    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', () => {
            updateChart();
        });
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }
});
