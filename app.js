document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale');
    const gesBoxSelect = document.getElementById('gesBoxSelect'); // Menu déroulant pour filtrer l'historique
    const volumeChartCanvas = document.getElementById('volumeChart');
    const historyTableBody = document.querySelector('#historyTable tbody');

    let chart;
    let gesboxData = []; // Contient les données de toutes les GesBoxes

    // URLs des feuilles CSV pour chaque GesBox
    const googleSheetURLs = {
        GesBox1: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTq76nAzQ1hHt1bcPoaq9Azm4LFdOEsnd7d7lXakDdCKdoOfpA-S1DXi52bsKLIRQU2aUrPFX3A-Mq6/pub?gid=1085731608&output=csv",
        GesBox2: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTq76nAzQ1hHt1bcPoaq9Azm4LFdOEsnd7d7lXakDdCKdoOfpA-S1DXi52bsKLIRQU2aUrPFX3A-Mq6/pub?gid=1079523738&output=csv"
    };

    function updateChart() {
        if (chart) chart.destroy();

        const validData = gesboxData
            .filter(item =>
                typeof item.volume === 'number' &&
                typeof item.volume_cumule === 'number' &&
                typeof item.timestamp === 'number'
            )
            .sort((a, b) => a.timestamp - b.timestamp);

        // Créer des jeux de données pour chaque GesBox
        const datasets = [
            {
                label: 'GesBox1',
                data: validData.filter(item => item.gesBoxId === "GesBox1").map(item => ({
                    x: item.timestamp * 1000,
                    y: item.volume_cumule
                })),
                borderColor: 'lightblue',
                fill: false,
                pointRadius: 0,
                hitRadius: 0
            },
            {
                label: 'GesBox2',
                data: validData.filter(item => item.gesBoxId === "GesBox2").map(item => ({
                    x: item.timestamp * 1000,
                    y: item.volume_cumule
                })),
                borderColor: 'orange',
                fill: false,
                pointRadius: 0,
                hitRadius: 0
            }
        ];

        // Filtrer les jeux de données pour ne pas afficher ceux vides
        const nonEmptyDatasets = datasets.filter(dataset => dataset.data.length > 0);

        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: nonEmptyDatasets
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeScaleSelect.value,
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
                            text: 'Volume d\'eau Cumulé (L)'
                        }
                    }
                }
            }
        });
    }

    function updateHistoryTable(selectedGesBox) {
        historyTableBody.innerHTML = '';

        // Filtrer les données en fonction de la GesBox sélectionnée
        const filteredData = selectedGesBox === "all"
            ? gesboxData
            : gesboxData.filter(item => item.gesBoxId === selectedGesBox);

        filteredData.forEach(item => {
            const row = historyTableBody.insertRow();
            const gesBoxIdCell = row.insertCell();
            const volumeCell = row.insertCell();
            const volumeCumuleCell = row.insertCell();
            const dateCell = row.insertCell();

            const date = new Date(item.timestamp * 1000);
            gesBoxIdCell.textContent = item.gesBoxId;
            volumeCell.textContent = item.volume.toFixed(2);
            volumeCumuleCell.textContent = item.volume_cumule.toFixed(2);
            dateCell.textContent = date.toLocaleString();
        });
    }

    function fetchDataFromGoogleSheets() {
        Promise.all([
            fetch(googleSheetURLs.GesBox1).then(response => response.text()),
            fetch(googleSheetURLs.GesBox2).then(response => response.text())
        ])
        .then(([csvData1, csvData2]) => {
            console.log("Données CSV brutes GesBox1 :", csvData1);
            console.log("Données CSV brutes GesBox2 :", csvData2);

            gesboxData = [];
            historyTableBody.innerHTML = '';

            [csvData1, csvData2].forEach((csvData, index) => {
                const gesBoxId = index === 0 ? "GesBox1" : "GesBox2";

                const lines = csvData.split('\n');
                if (lines.length <= 1) {
                    console.warn(`Aucune donnée (en-têtes uniquement) dans le CSV pour ${gesBoxId}.`);
                    return;
                }

                // Nettoyer les en-têtes
                const headers = lines[0].split(',').map(header => header.trim());
                console.log(`En-têtes nettoyés pour ${gesBoxId} :`, headers);

                for (let i = 1; i < lines.length; i++) {
                    const data = lines[i].split(',');
                    if (data.length === headers.length && data.every(cell => cell.trim() !== '')) {
                        const item = {};
                        for (let j = 0; j < headers.length; j++) {
                            item[headers[j]] = data[j].trim();
                        }

                        // Supprimer les guillemets autour des valeurs numériques
                        const volumeStr = item.volume.replace(/"/g, '');
                        const volumeCumuleStr = item.volume_cumule.replace(/"/g, '');
                        const timestampStr = item.timestamp;

                        console.log(`Avant conversion - GesBoxId: ${gesBoxId}, Volume: ${volumeStr}, Volume Cumulé: ${volumeCumuleStr}, Timestamp: ${timestampStr}`);

                        const volume = parseFloat(volumeStr.replace(/,/g, '.'));
                        const volume_cumule = parseFloat(volumeCumuleStr.replace(/,/g, '.'));
                        const timestamp = parseInt(timestampStr);

                        console.log(`Après conversion - GesBoxId: ${gesBoxId}, Volume: ${volume}, Volume Cumulé: ${volume_cumule}, Timestamp: ${timestamp}`);

                        if (!isNaN(volume) && !isNaN(volume_cumule) && !isNaN(timestamp)) {
                            gesboxData.push({ gesBoxId, volume, volume_cumule, timestamp });
                        } else {
                            console.warn(`Ligne ignorée en raison de données invalides pour ${gesBoxId}:`, item);
                        }
                    }
                }
            });

            console.log("gesboxData final :", gesboxData);

            // Mettre à jour le graphique et l'historique
            updateChart();
            updateHistoryTable(gesBoxSelect.value);
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des données:', error);
            alert("Impossible de charger les données. Veuillez vérifier votre connexion ou réessayer plus tard.");
        });
    }

    // Écouter les changements dans le menu déroulant de l'échelle de temps
    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', updateChart);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    // Écouter les changements dans le menu déroulant de l'historique
    if (gesBoxSelect) {
        gesBoxSelect.addEventListener('change', () => {
            updateHistoryTable(gesBoxSelect.value); // Mettre à jour uniquement l'historique
        });
    } else {
        console.error("Élément gesBoxSelect non trouvé !");
    }

    fetchDataFromGoogleSheets();
    setInterval(fetchDataFromGoogleSheets, 60000);
});
