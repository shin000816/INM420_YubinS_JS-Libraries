"use strict";

const app = document.getElementById("app");
const select = document.getElementById("countries");
const btn = document.getElementById("btn");
const statusEl = document.getElementById("status");

let dataCache = null;
let glideInstance = null;
let chartInstance = null;
let mapInstance = null;
let mapLayer = null;

function set_status(message = "", is_error = false) {
    if (!message) {
        statusEl.style.display = "none";
        statusEl.textContent = "";
        return;
    }

    statusEl.style.display = "block";
    statusEl.textContent = message;

    if (is_error) {
        statusEl.style.background = "#f8d7da";
        statusEl.style.borderColor = "#f1aeb5";
    } else {
        statusEl.style.background = "#fff3cd";
        statusEl.style.borderColor = "#ffe69c";
    }
}

async function load_data() {
    if (dataCache) return dataCache;

    try {
        set_status("loading destination data...");
        const res = await fetch("./data/destinations.json");
        if (!res.ok) throw new Error("failed to load json");

        const json = await res.json();
        dataCache = json;
        set_status("");
        return json;
    } catch (err) {
        set_status("could not load destination data. check /data/destinations.json", true);
        throw err;
    }
}

function destroy_instances() {
    if (glideInstance) {
        glideInstance.destroy();
        glideInstance = null;
    }

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        mapLayer = null;
    }
}

function render(destination) {
    destroy_instances();

    app.innerHTML = `
        <section class="card" data-aos="fade-up">
            <div class="cardHead">
                <h2>${destination.name}</h2>
                <span class="badge">${destination.best_season}</span>
            </div>

            <p class="muted">${destination.tagline}</p>
        </section>

        <section class="card" data-aos="fade-up">
            <h2>Photos</h2>

            <div class="glide" id="glide">
                <div class="glide__track" data-glide-el="track">
                    <ul class="glide__slides">
                        ${destination.images
                            .map((src) => `<li class="glide__slide"><img src="${src}" alt="${destination.name} photo" /></li>`)
                            .join("")}
                    </ul>
                </div>
            </div>
        </section>

        <section class="grid2">
            <section class="card" data-aos="fade-up">
                <h2>Snapshot</h2>

                <div class="snapshot">
                    <div class="row">
                        <span class="label">Currency</span>
                        <span class="value">${destination.currency}</span>
                    </div>
                    <div class="row">
                        <span class="label">Avg Daily Budget</span>
                        <span class="value">$${destination.avg_daily_budget}</span>
                    </div>
                    <div class="row">
                        <span class="label">Highlights</span>
                        <span class="value">${destination.highlights.join(", ")}</span>
                    </div>
                </div>
            </section>

            <section class="card" data-aos="fade-up">
                <h2>Quick Chart</h2>
                <div class="chartWrap">
                    <canvas id="chart"></canvas>
                </div>
            </section>
        </section>

        <section class="card" data-aos="fade-up">
            <h2>Map</h2>
            <div id="map" class="map" aria-label="map"></div>
        </section>
    `;

    // glide
    glideInstance = new Glide("#glide", {
        type: "carousel",
        perView: 1,
        gap: 12,
        autoplay: 2500,
        hoverpause: true
    });
    glideInstance.mount();

    // chart.js
    const ctx = document.getElementById("chart");
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["safety", "food", "budget"],
            datasets: [
                {
                    label: "score",
                    data: [
                        destination.safety_index,
                        destination.food_score,
                        Math.max(0, 200 - destination.avg_daily_budget)
                    ]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });

    // leaflet
    mapInstance = L.map("map", {
        scrollWheelZoom: false
    }).setView(destination.map.center, destination.map.zoom);

    mapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; openstreetmap contributors"
    });

    mapLayer.addTo(mapInstance);

    destination.map.spots.forEach((spot) => {
        L.marker(spot.coords).addTo(mapInstance).bindPopup(spot.name);
    });

    // aos refresh (because we re-render)
    AOS.refreshHard();
}

async function init() {
    AOS.init({
        duration: 650,
        once: true,
        offset: 80
    });

    const data = await load_data();

    // render default selection on load
    const firstKey = select.value;
    if (data[firstKey]) render(data[firstKey]);

    // button click event
    btn.addEventListener("click", () => {
        const key = select.value;
        const destination = data[key];

        if (!destination) {
            set_status("destination not found in json", true);
            return;
        }

        set_status("");
        render(destination);
    });
}

init();