// Constants
const TASK_ROWS = 18;
const TOMORROW_ROWS = 6;

// Elements
const taskList = document.getElementById("taskList");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const dayDate = document.getElementById("dayDate");
const dayTopic = document.getElementById("dayTopic");
const tomorrowGrid = document.getElementById("tomorrowGrid");
const saveDayBtn = document.getElementById("saveDayBtn");
const clearListBtn = document.getElementById("clearListBtn");

// Storage Helpers
function getStorageKeyFromDate(dateString) {
  if (!dateString || dateString.trim() === "") {
    return null;
  }

  return `todo-${dateString}`;
}

function getStorageKeyByDate() {
  return getStorageKeyFromDate(dayDate.value.trim());
}

function getNextDateString(currentDateString) {
  const [year, month, day] = currentDateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + 1);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

// Create Task Rows
function createTaskRows() {
  for (let i = 0; i < TASK_ROWS; i++) {
    const row = document.createElement("div");
    row.className = "task-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.disabled = true;
    checkbox.setAttribute("aria-label", `Mark task ${i + 1} as completed`);

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.className = "task-time";
    timeInput.setAttribute("aria-label", `Time for task ${i + 1}`);

    const activityInput = document.createElement("input");
    activityInput.type = "text";
    activityInput.className = "task-activity";
    activityInput.setAttribute("aria-label", `Task ${i + 1}`);

    row.appendChild(checkbox);
    row.appendChild(timeInput);
    row.appendChild(activityInput);
    taskList.appendChild(row);

    const handleRowInput = () => {
      const hasTask =
        activityInput.value.trim() !== "" || timeInput.value.trim() !== "";

      checkbox.disabled = !hasTask;

      if (!hasTask) {
        checkbox.checked = false;
      }

      updateProgress();
      autoSave();
    };

    timeInput.addEventListener("input", handleRowInput);
    activityInput.addEventListener("input", handleRowInput);

    checkbox.addEventListener("change", () => {
      const hasTask =
        activityInput.value.trim() !== "" || timeInput.value.trim() !== "";

      if (!hasTask) {
        checkbox.checked = false;
        checkbox.disabled = true;
      }

      updateProgress();
      autoSave();
    });
  }
}

// Create Tomorrow Rows
function createTomorrowRows() {
  for (let i = 0; i < TOMORROW_ROWS; i++) {
    const item = document.createElement("div");
    item.className = "tomorrow-item";

    const box = document.createElement("div");
    box.className = "tomorrow-box";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "tomorrow-input";
    input.setAttribute("aria-label", `Tomorrow task ${i + 1}`);

    input.addEventListener("input", autoSave);

    item.appendChild(box);
    item.appendChild(input);
    tomorrowGrid.appendChild(item);
  }
}

// Get Helpers
function getTaskRows() {
  return [...document.querySelectorAll(".task-row")];
}

function getTomorrowInputs() {
  return [...document.querySelectorAll(".tomorrow-input")];
}

// Progress
function updateProgress() {
  const rows = getTaskRows();

  const usedRows = rows.filter((row) => {
    const time = row.querySelector(".task-time").value.trim();
    const activity = row.querySelector(".task-activity").value.trim();

    return time !== "" || activity !== "";
  });

  const completedRows = usedRows.filter((row) =>
    row.querySelector(".task-checkbox").checked
  );

  const percent =
    usedRows.length === 0
      ? 0
      : Math.round((completedRows.length / usedRows.length) * 100);

  progressText.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

// Data Management
function getData() {
  return {
    date: dayDate.value,
    topic: dayTopic.value,
    tasks: getTaskRows().map((row) => ({
      time: row.querySelector(".task-time").value,
      activity: row.querySelector(".task-activity").value,
      completed: row.querySelector(".task-checkbox").checked,
    })),
    tomorrow: getTomorrowInputs().map((input) => input.value),
  };
}

function setData(data) {
  if (!data) return;

  dayDate.value = data.date || "";
  dayTopic.value = data.topic || "";

  const rows = getTaskRows();

  (data.tasks || []).forEach((task, index) => {
    if (!rows[index]) return;

    const timeInput = rows[index].querySelector(".task-time");
    const activityInput = rows[index].querySelector(".task-activity");
    const checkbox = rows[index].querySelector(".task-checkbox");

    timeInput.value = task.time || "";
    activityInput.value = task.activity || "";

    const hasTask =
      (task.time || "").trim() !== "" || (task.activity || "").trim() !== "";

    checkbox.disabled = !hasTask;
    checkbox.checked = hasTask ? Boolean(task.completed) : false;
  });

  const tomorrowInputs = getTomorrowInputs();

  (data.tomorrow || []).forEach((value, index) => {
    if (tomorrowInputs[index]) {
      tomorrowInputs[index].value = value || "";
    }
  });

  updateProgress();
}

function clearFormFields() {
  dayTopic.value = "";

  getTaskRows().forEach((row) => {
    row.querySelector(".task-time").value = "";
    row.querySelector(".task-activity").value = "";

    const checkbox = row.querySelector(".task-checkbox");
    checkbox.checked = false;
    checkbox.disabled = true;
  });

  getTomorrowInputs().forEach((input) => {
    input.value = "";
  });

  updateProgress();
}

// Save and Load
function autoSave() {
  const storageKey = getStorageKeyByDate();

  if (!storageKey) return;

  localStorage.setItem(storageKey, JSON.stringify(getData()));
}

function loadSavedData() {
  const storageKey = getStorageKeyByDate();

  if (!storageKey) return;

  const raw = localStorage.getItem(storageKey);

  if (!raw) return;

  try {
    setData(JSON.parse(raw));
  } catch (error) {
    console.error("Could not load saved data:", error);
  }
}

// Reset and Clear
function resetForm() {
  clearFormFields();
}

function clearList() {
  const storageKey = getStorageKeyByDate();

  if (storageKey) {
    localStorage.removeItem(storageKey);
  }

  clearFormFields();
}

// Tomorrow Tasks Transfer
function moveTomorrowTasksToNextDay() {
  const currentDate = dayDate.value.trim();

  if (currentDate === "") return;

  const nextDate = getNextDateString(currentDate);
  const nextStorageKey = getStorageKeyFromDate(nextDate);

  if (!nextStorageKey) return;

  const tomorrowTasks = getTomorrowInputs()
    .map((input) => input.value.trim())
    .filter((task) => task !== "");

  if (tomorrowTasks.length === 0) return;

  let nextDayData = {
    date: nextDate,
    topic: "",
    tasks: [],
    tomorrow: [],
  };

  const existingRaw = localStorage.getItem(nextStorageKey);

  if (existingRaw) {
    try {
      nextDayData = JSON.parse(existingRaw);
    } catch (error) {
      console.error("Could not parse next day data:", error);
    }
  }

  if (!Array.isArray(nextDayData.tasks)) {
    nextDayData.tasks = [];
  }

  while (nextDayData.tasks.length < TASK_ROWS) {
    nextDayData.tasks.push({
      time: "",
      activity: "",
      completed: false,
    });
  }

  let tomorrowIndex = 0;

  for (let i = 0; i < nextDayData.tasks.length; i++) {
    const task = nextDayData.tasks[i];
    const rowIsEmpty =
      (task.time || "").trim() === "" &&
      (task.activity || "").trim() === "";

    if (rowIsEmpty && tomorrowIndex < tomorrowTasks.length) {
      nextDayData.tasks[i].activity = tomorrowTasks[tomorrowIndex];
      nextDayData.tasks[i].time = "";
      nextDayData.tasks[i].completed = false;
      tomorrowIndex++;
    }
  }

  localStorage.setItem(nextStorageKey, JSON.stringify(nextDayData));
}

// Buttons Actions
function saveDay() {
  autoSave();
  moveTomorrowTasksToNextDay();
  alert("Day saved!");
}

// Events
saveDayBtn.addEventListener("click", saveDay);
clearListBtn.addEventListener("click", clearList);

dayDate.addEventListener("change", () => {
  resetForm();
  loadSavedData();
});

dayTopic.addEventListener("input", autoSave);

// Init
createTaskRows();
createTomorrowRows();
loadSavedData();
updateProgress();