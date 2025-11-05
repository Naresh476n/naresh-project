// app.js - WebSocket client for ESP32 Power Tracker

// Helper functions for formatting
function formatValue(value, decimals, unit) {
  const safeDec = Math.max(0, Math.floor(decimals)) || 0;
  return Number(value || 0).toFixed(safeDec) + " " + unit;
}

function createNotificationElement(notification) {
  const li = document.createElement("li");
  const dt = new Date((notification.ts || 0) * 1000).toLocaleString();
  li.textContent = dt + " — " + (notification.text || notification);
  return li;
}

function createTile(title, id = null) {
  const tile = document.createElement("div");
  tile.className = "tile";
  const isTotal = id === null;
  tile.id = isTotal ? "tileTotal" : "tile" + id;
  const suffix = isTotal ? "t" : id;
  tile.innerHTML = `
    <h4>${title}</h4>
    <div class="kv"><span>Voltage:</span><span id="v${suffix}">0 V</span></div>
    <div class="kv"><span>Current:</span><span id="c${suffix}">0 A</span></div>
    <div class="kv"><span>Power:</span><span id="p${suffix}">0 W</span></div>
    <div class="kv"><span>Energy:</span><span id="e${suffix}">0 Wh</span></div>
    ${!isTotal ? '<div class="kv"><span>State:</span><span id="s' + id + '">OFF</span></div>' : ''}
  `;
  return tile;
}

// ⏰ Live Date + Time (dd/mm/yyyy, 12-hour, with day)
function updateClock() {
  const now = new Date();
  const day = now.toLocaleDateString("en-GB", { weekday: "long" }); // Monday
  const date = now.toLocaleDateString("en-GB"); // dd/mm/yyyy
  const time = now.toLocaleTimeString("en-US", { hour12: true }); // 12-hour format
  document.getElementById("dateTime").innerText = `${day}, ${date} | ${time}`;
}
setInterval(updateClock, 1000);
updateClock();




const WS_PORT = 81;
const ws = new WebSocket("ws://" + location.hostname + ":" + WS_PORT);

document.getElementById('ip').innerText = location.hostname;

// Build live tiles
const liveDiv = document.getElementById("live");
for (let i = 1; i <= 4; i++) {
  liveDiv.appendChild(createTile(`Load ${i}`, i));
}

// ✅ Add Total Power Usage card
liveDiv.appendChild(createTile("Total Power Usage"));

// Relay switches
for (let i=1;i<=4;i++){
  const el = document.getElementById("relay"+i);
  el.addEventListener("change", e=>{
    ws.send(JSON.stringify({cmd:"relay", id:i, state:e.target.checked}));
  });
}

// Timer UI
document.querySelectorAll(".preset").forEach(btn=>{
  btn.addEventListener("click", ()=> document.getElementById("customMin").value = btn.dataset.min);
});
document.getElementById("applyTimer").addEventListener("click", ()=>{
  const sel = parseInt(document.getElementById("loadSelect").value);
  const val = parseInt(document.getElementById("customMin").value || "0", 10);
  ws.send(JSON.stringify({cmd:"setTimer", id:sel, minutes: val>0?val:0}));
});

// Limits
document.getElementById("saveLimits").addEventListener("click", ()=>{
  const vals = [1, 2, 3, 4].map(i => 
    parseFloat(document.getElementById("limit" + i).value || "12")
  );
  vals.forEach((h,i)=>{
    const sec = Math.max(1, Math.round(h*3600));
    ws.send(JSON.stringify({cmd:"setLimit", id:i+1, seconds:sec}));
  });
});

// Price
document.getElementById("savePrice").addEventListener("click", ()=>{
  const p = parseFloat(document.getElementById("price").value||"8");
  ws.send(JSON.stringify({cmd:"setPrice", price:p}));
});

// Notifications
document.getElementById("refreshNotifs").addEventListener("click", async ()=>{
  const r = await fetch("/notifs.json");
  const j = await r.json();
  showNotifs(j.notifs || []);
});
document.getElementById("clearNotifs").addEventListener("click", ()=>{
  ws.send(JSON.stringify({cmd:"clearNotifs"}));
  document.getElementById("notifs").innerHTML = "";
});

// Charts / PDF util
const chartCtx = document.getElementById("chart").getContext("2d");
const chart = new Chart(chartCtx, {
  type: "line",
  data: { labels: [], datasets: [
    { label: "Load1", data: [] },
    { label: "Load2", data: [] },
    { label: "Load3", data: [] },
    { label: "Load4", data: [] }
  ]},
  options: { responsive:true, plugins:{legend:{display:true}} }
});
document.getElementById("downloadPdf").addEventListener("click", async ()=>{
  const r = await fetch("/logs.json");
  const j = await r.json();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("ESP32 Power Tracker - Logs snapshot", 10, 10);
  doc.text(JSON.stringify(j).slice(0, 1500), 10, 20);
  doc.save("logs.pdf");
});

// WebSocket incoming messages
ws.onopen = ()=> { console.log("WS open"); }
ws.onclose = ()=> { console.log("WS closed"); }
ws.onerror = e=> { console.error("WS err", e); }
ws.onmessage = (evt)=>{
  try {
    const data = JSON.parse(evt.data);
    if(data.type === "state" && data.loads){
      let totalV=0,totalC=0,totalP=0,totalE=0;
      data.loads.forEach((L)=>{
        const i = L.id;
        document.getElementById("v"+i).innerText = formatValue(L.voltage, 2, "V");
        document.getElementById("c"+i).innerText = formatValue(L.current, 3, "A");
        document.getElementById("p"+i).innerText = formatValue(L.power, 2, "W");
        document.getElementById("e"+i).innerText = formatValue(L.energy, 2, "Wh");
        document.getElementById("s"+i).innerText = L.relay ? "ON" : "OFF";
        document.getElementById("relay"+i).checked = !!L.relay;

        totalV += Number(L.voltage||0);
        totalC += Number(L.current||0);
        totalP += Number(L.power||0);
        totalE += Number(L.energy||0);
      });
      // update total card
      document.getElementById("vt").innerText = formatValue(totalV, 2, "V");
      document.getElementById("ct").innerText = formatValue(totalC, 3, "A");
      document.getElementById("pt").innerText = formatValue(totalP, 2, "W");
      document.getElementById("et").innerText = formatValue(totalE, 2, "Wh");

      if(data.unitPrice) document.getElementById("price").value = data.unitPrice;
    } else if(data.type === "notification"){
      prependNotif({ts: Date.now()/1000, text: data.text});
    }
  } catch(e){
    console.error("WS parse error", e);
  }
};

// helper UI functions
function showNotifs(arr){
  const ul = document.getElementById("notifs");
  ul.innerHTML = "";
  arr.reverse().forEach(n => ul.appendChild(createNotificationElement(n)));
}
function prependNotif(n){
  const ul = document.getElementById("notifs");
  ul.insertBefore(createNotificationElement(n), ul.firstChild);
}

// Initial load of notifs and settings
(async function init(){
  try {
    const r = await fetch("/notifs.json"); if(r.ok){ const j = await r.json(); showNotifs(j.notifs || []); }
    const s = await fetch("/settings.json"); if(s.ok){ const js = await s.json(); document.getElementById("price").value = js.unitPrice || 8; }
  } catch(e){ console.warn("Init fetch failed", e); }
})();


// 🚪 Logout
function logout() {
  window.location.href = "index.html"; // redirect to login page
}
