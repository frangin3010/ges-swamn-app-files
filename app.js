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
                typeof item.timestamp === 'number' &&
                typeof item.volume === 'number' &&  // volume est le volume instantané
                typeof item.volume_cumule === 'number' // volume_cumule est le volume cumulé
            )
            .sort((a, b) => a.timestamp - b.timestamp);

        if (validData.length === 0) {
            console.warn("Aucune donnée valide à afficher");
            return;
        }

        const dataPoints = validData.map(item => ({
            x: item.timestamp * 1000,
            y: item.volume_cumule  // Affiche le volume cumulé dans le graphique
        }));

        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Volume Cumulé (L)', // Modifiez le label du graphique
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
                            text: 'Volume d\'eau Cumulé (L)' // Modifiez le label de l'axe Y
                        }
                    }
                }
            }
        });
    }

    function updateHistoryTable(volume, volume_cumule, timestamp) {  // Ajoute volume_cumule
        if (typeof volume !== 'number' || typeof volume_cumule !== 'number' || typeof timestamp !== 'number') { // Ajoute volume_cumule
            console.error("Données invalides :", { volume, volume_cumule, timestamp }); // Ajoute volume_cumule
            return;
        }

        const row = historyTableBody.insertRow();
        const volumeCell = row.insertCell();
        const volumeCumuleCell = row.insertCell();  // Nouvelle cellule pour le volume cumulé
        const dateCell = row.insertCell();

        const date = new Date(timestamp * 1000);
        volumeCell.textContent = volume.toFixed(2); // Affiche le volume instantané
        volumeCumuleCell.textContent = volume_cumule.toFixed(2); // Affiche le volume cumulé
        dateCell.textContent = date.toLocaleString();
    }

    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', updateChart);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    function fetchDataFromGoogleSheets() {
        fetch(googleSheetURL)
            .then(response => response.text())
            .then(csvData => {
                gesboxData = [];
                historyTableBody.innerHTML = '';

                const lines = csvData.split('\n');
                const headers = lines[0].split(',');

                for (let i = 1; i < lines.length; i++) {
                    const data = lines[i].split(',');
                    if (data.length === headers.length) {
                        const item = {};
                        for (let j = 0; j < headers.length; j++) {
                            item[headers[j].trim()] = data[j].trim();
                        }

                        const volume = parseFloat(item.volume);
                        const volume_cumule = parseFloat(item.volume_cumule);  // Récupère le volume cumulé
                        const timestamp = parseInt(item.timestamp);

                        if (typeof volume === 'number' && !isNaN(volume) &&
                            typeof volume_cumule === 'number' && !isNaN(volume_cumule) && // Vérifie que volume_cumule est un nombre valide
                            typeof timestamp === 'number' && !isNaN(timestamp)) {

                            gesboxData.push({ volume, volume_cumule, timestamp }); // Ajoute volume_cumule aux données
                            updateHistoryTable(volume, volume_cumule, timestamp); // Met à jour le tableau avec volume_cumule
                        } else {
                            console.error("Données invalides :", item);
                        }
                    }
                }
                updateChart();
            })
            .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }

    fetchDataFromGoogleSheets();
    setInterval(fetchDataFromGoogleSheets, 60000);
});
