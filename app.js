document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale');
    const volumeChartCanvas = document.getElementById('volumeChart');
    const historyTableBody = document.querySelector('#historyTable tbody');

    let chart;
    let gesboxData = [];

    // Remplacez cette URL par l'URL de votre feuille Google Sheets publiée au format CSV
    const googleSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTq76nAzQ1hHt1bcPoaq9Azm4LFdOEsnd7d7lXakDdCKdoOfpA-S1DXi52bsKLIRQU2aUrPFX3A-Mq6/pub?output=csv";

    function updateChart() {
        const timeScale = timeScaleSelect.value;
        if (chart) chart.destroy();

        const validData = gesboxData
            .filter(item =>
                typeof item.volume === 'number' &&
                typeof item.volume_cumule === 'number' &&
                typeof item.timestamp === 'number'
            )
            .sort((a, b) => a.timestamp - b.timestamp);

        if (validData.length === 0) {
            console.warn("Aucune donnée valide à afficher");
            return;
        }

        const dataPoints = validData.map(item => ({
            x: item.timestamp * 1000, // Multiplier par 1000 car JavaScript utilise des millisecondes
            y: item.volume_cumule
        }));

        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Volume Cumulé (L)',
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
                            text: 'Volume d\'eau Cumulé (L)'
                        }
                    }
                }
            }
        });
    }

    function updateHistoryTable(gesBoxId, volume, volume_cumule, timestamp) {
        if (isNaN(volume) || isNaN(volume_cumule) || isNaN(timestamp)) {
            console.error("Données invalides :", { gesBoxId, volume, volume_cumule, timestamp });
            return;
        }

        const row = historyTableBody.insertRow();
        const gesBoxIdCell = row.insertCell(); // Nouvelle cellule pour gesBoxId
        const volumeCell = row.insertCell();
        const volumeCumuleCell = row.insertCell();
        const dateCell = row.insertCell();

        const date = new Date(timestamp * 1000); // Convertit le timestamp en date
        gesBoxIdCell.textContent = gesBoxId; // Ajout de gesBoxId
        volumeCell.textContent = volume.toFixed(2);
        volumeCumuleCell.textContent = volume_cumule.toFixed(2);
        dateCell.textContent = date.toLocaleString();
    }

    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', updateChart);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    function fetchDataFromGoogleSheets() {
        fetch(googleSheetURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP : ${response.status}`);
                }
                return response.text();
            })
            .then(csvData => {
                console.log("Données CSV brutes :", csvData);

                gesboxData = [];
                historyTableBody.innerHTML = '';

                const lines = csvData.split('\n');
                if (lines.length <= 1) {
                    console.warn("Aucune donnée (en-têtes uniquement) dans le CSV.");
                    return;
                }

                const headers = lines[0].split(',');
                for (let i = 1; i < lines.length; i++) {
                    const data = lines[i].split(',');
                    if (data.length === headers.length && data.every(cell => cell.trim() !== '')) {
                        const item = {};
                        for (let j = 0; j < headers.length; j++) {
                            item[headers[j].trim()] = data[j].trim();
                        }

                        const gesBoxId = item.gesBoxId;
                        const volumeStr = item.volume.replace(/,/g, '.'); // Remplacement des virgules par des points
                        const volumeCumuleStr = item.volume_cumule.replace(/,/g, '.');
                        const timestampStr = item.timestamp;

                        console.log("Avant conversion - GesBoxId:", gesBoxId, "Volume:", volumeStr, "Volume Cumulé:", volumeCumuleStr, "Timestamp:", timestampStr);

                        const volume = parseFloat(volumeStr);
                        const volume_cumule = parseFloat(volumeCumuleStr);
                        const timestamp = parseInt(timestampStr);

                        console.log("Après conversion - GesBoxId:", gesBoxId, "Volume:", volume, "Volume Cumulé:", volume_cumule, "Timestamp:", timestamp);

                        if (!isNaN(volume) && !isNaN(volume_cumule) && !isNaN(timestamp)) {
                            gesboxData.push({ gesBoxId, volume, volume_cumule, timestamp });
                            updateHistoryTable(gesBoxId, volume, volume_cumule, timestamp);
                        } else {
                            console.warn("Ligne ignorée en raison de données invalides :", item);
                        }
                    }
                }

                console.log("gesboxData final :", gesboxData);
                updateChart();
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des données:', error);
                alert("Impossible de charger les données. Veuillez vérifier votre connexion ou réessayer plus tard.");
            });
    }

    fetchDataFromGoogleSheets();
    setInterval(fetchDataFromGoogleSheets, 60000);
});
