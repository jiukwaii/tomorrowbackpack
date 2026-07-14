const STORAGE_KEY = "day-after-tomorrow-backpack";

const weekDays = [
  { key: "monday", label: "星期一", short: "周一" },
  { key: "tuesday", label: "星期二", short: "周二" },
  { key: "wednesday", label: "星期三", short: "周三" },
  { key: "thursday", label: "星期四", short: "周四" },
  { key: "friday", label: "星期五", short: "周五" },
];

const defaultState = {
  subjects: [
    { id: uid(), name: "数学", items: ["数学课本", "练习本", "计算机"] },
    { id: uid(), name: "科学", items: ["科学笔记", "实验衣"] },
    { id: uid(), name: "华文", items: ["华文课本", "华文作业"] },
  ],
  schedule: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  },
  temporaryItems: {},
  checkedItems: {},
};

let state = loadState();
let dayRefreshTimer = null;

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  targetLabel: document.getElementById("target-label"),
  targetDayText: document.getElementById("target-day-text"),
  targetDateChip: document.getElementById("target-date-chip"),
  dayAfterTomorrowCoursePills: document.getElementById("day-after-tomorrow-course-pills"),
  dayAfterTomorrowChecklist: document.getElementById("day-after-tomorrow-checklist"),
  dayAfterTomorrowProgress: document.getElementById("day-after-tomorrow-progress"),
  dayAfterTomorrowEmpty: document.getElementById("day-after-tomorrow-empty"),
  temporaryItemForm: document.getElementById("temporary-item-form"),
  temporaryItemInput: document.getElementById("temporary-item-input"),
  resetDayAfterTomorrowChecks: document.getElementById("reset-day-after-tomorrow-checks"),
  weekGrid: document.getElementById("week-grid"),
  subjectForm: document.getElementById("subject-form"),
  subjectNameInput: document.getElementById("subject-name-input"),
  subjectItemsInput: document.getElementById("subject-items-input"),
  subjectList: document.getElementById("subject-list"),
  scheduleQuickForm: document.getElementById("schedule-quick-form"),
  scheduleDaySelect: document.getElementById("schedule-day-select"),
  scheduleSubjectSelect: document.getElementById("schedule-subject-select"),
  scheduleEditor: document.getElementById("schedule-editor"),
  checklistTemplate: document.getElementById("checklist-item-template"),
};

init();

function init() {
  bindEvents();
  scheduleDateRefresh();
  render();
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  els.temporaryItemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.temporaryItemInput.value.trim();
    if (!name) return;

    const targetDateKey = getTargetDateInfo().dateKey;
    const list = state.temporaryItems[targetDateKey] ?? [];
    list.push({ id: uid(), name });
    state.temporaryItems[targetDateKey] = list;
    els.temporaryItemInput.value = "";
    persistAndRender();
  });

  els.resetDayAfterTomorrowChecks.addEventListener("click", () => {
    const targetDateKey = getTargetDateInfo().dateKey;
    state.checkedItems[targetDateKey] = [];
    persistAndRender();
  });

  els.subjectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.subjectNameInput.value.trim();
    const items = splitItems(els.subjectItemsInput.value);

    if (!name) return;
    if (state.subjects.some((subject) => subject.name === name)) {
      alert("这个科目已经存在了，可以直接在下面继续编辑。");
      return;
    }

    state.subjects.push({
      id: uid(),
      name,
      items,
    });

    els.subjectNameInput.value = "";
    els.subjectItemsInput.value = "";
    persistAndRender();
  });

  els.scheduleQuickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const dayKey = els.scheduleDaySelect.value;
    const subjectId = els.scheduleSubjectSelect.value;
    if (!dayKey || !subjectId) return;
    addSubjectToDay(dayKey, subjectId);
    els.scheduleSubjectSelect.value = "";
  });
}

function render() {
  renderDayAfterTomorrowView();
  renderWeekView();
  renderSubjects();
  renderScheduleForm();
  renderScheduleEditor();
}

function renderDayAfterTomorrowView() {
  const target = getTargetDateInfo();
  const subjectIds = state.schedule[target.dayKey] ?? [];
  const subjectNames = subjectIds
    .map((subjectId) => getSubjectById(subjectId)?.name)
    .filter(Boolean);
  const checklistItems = buildChecklistForDateKey(target.dateKey, target.dayKey);
  const checkedSet = new Set(state.checkedItems[target.dateKey] ?? []);
  const completedCount = checklistItems.filter((item) => checkedSet.has(item.id)).length;

  els.targetLabel.textContent = target.banner;
  els.targetDayText.textContent = `${target.dayLabel}要带这些`;
  els.targetDateChip.textContent = target.dateText;
  els.dayAfterTomorrowProgress.textContent = `${completedCount} / ${checklistItems.length}`;

  els.dayAfterTomorrowCoursePills.innerHTML = "";
  if (subjectNames.length > 0) {
    subjectNames.forEach((name) => {
      const pill = document.createElement("span");
      pill.className = "course-pill";
      pill.textContent = name;
      els.dayAfterTomorrowCoursePills.appendChild(pill);
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "course-empty";
    empty.textContent = "后天目前没有课程，你也可以只添加临时项目。";
    els.dayAfterTomorrowCoursePills.appendChild(empty);
  }

  els.dayAfterTomorrowChecklist.innerHTML = "";
  checklistItems.forEach((item) => {
    const node = renderChecklistItem({
      item,
      dateKey: target.dateKey,
      checked: checkedSet.has(item.id),
      allowDelete: item.type === "temporary",
    });
    els.dayAfterTomorrowChecklist.appendChild(node);
  });

  els.dayAfterTomorrowEmpty.classList.toggle("hidden", checklistItems.length > 0);
}

function renderWeekView() {
  els.weekGrid.innerHTML = "";

  weekDays.forEach((day) => {
    const subjectIds = state.schedule[day.key] ?? [];
    const subjectNames = subjectIds
      .map((subjectId) => getSubjectById(subjectId)?.name)
      .filter(Boolean);
    const previewItems = buildChecklistForDateKey(`preview-${day.key}`, day.key, true);

    const card = document.createElement("article");
    card.className = "week-card";

    const top = document.createElement("div");
    top.className = "day-top";
    top.innerHTML = `
      <div>
        <div class="day-title">${day.label}</div>
        <p class="day-meta">${subjectNames.length ? subjectNames.join("、") : "尚未安排课程"}</p>
      </div>
      <button class="ghost-button" type="button">查看详情</button>
    `;

    const detail = document.createElement("div");
    detail.className = "hidden";

    const courses = document.createElement("div");
    courses.className = "selected-subjects";
    if (subjectNames.length > 0) {
      subjectNames.forEach((name) => {
        const pill = document.createElement("span");
        pill.className = "subject-select-pill";
        pill.textContent = name;
        courses.appendChild(pill);
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "course-empty";
      empty.textContent = "这一天还没有加入课程。";
      courses.appendChild(empty);
    }

    const list = document.createElement("div");
    list.className = "checklist";
    if (previewItems.length > 0) {
      previewItems.forEach((item) => {
        const preview = document.createElement("div");
        preview.className = "check-item";
        preview.innerHTML = `
          <span class="check-box"></span>
          <span class="check-copy">
            <strong class="item-name">${item.name}</strong>
            <span class="item-meta">${item.meta}</span>
          </span>
        `;
        list.appendChild(preview);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "这一天暂时没有需要准备的物品。";
      list.appendChild(empty);
    }

    top.querySelector("button").addEventListener("click", () => {
      detail.classList.toggle("hidden");
    });

    detail.append(courses, list);
    card.append(top, detail);
    els.weekGrid.appendChild(card);
  });
}

function renderSubjects() {
  els.subjectList.innerHTML = "";

  if (state.subjects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "subject-list-empty";
    empty.textContent = "先新增一个科目，下面的课程表才能开始排。";
    els.subjectList.appendChild(empty);
    return;
  }

  state.subjects.forEach((subject) => {
    const card = document.createElement("article");
    card.className = "subject-card";

    const header = document.createElement("div");
    header.className = "subject-card-header";
    header.innerHTML = `
      <div>
        <div class="subject-name">${subject.name}</div>
        <div class="small-note">固定物品会自动带到有这门课的那一天。</div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "list-inline";

    const renameButton = button("改名", "tiny-button");
    renameButton.addEventListener("click", () => renameSubject(subject.id));

    const deleteButton = button("删除科目", "tiny-button");
    deleteButton.addEventListener("click", () => deleteSubject(subject.id));

    actions.append(renameButton, deleteButton);
    header.appendChild(actions);

    const tags = document.createElement("div");
    tags.className = "subject-items";
    if (subject.items.length > 0) {
      subject.items.forEach((item, index) => {
        const token = document.createElement("span");
        token.className = "token";
        token.innerHTML = `<span>${item}</span>`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `删除 ${item}`);
        remove.addEventListener("click", () => removeSubjectItem(subject.id, index));
        token.appendChild(remove);
        tags.appendChild(token);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "small-note";
      empty.textContent = "这个科目还没有固定物品。";
      tags.appendChild(empty);
    }

    const addRow = document.createElement("div");
    addRow.className = "item-input-row";
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "新增这个科目的固定物品";
    const addButton = button("加入", "primary-button");
    addButton.addEventListener("click", () => {
      const name = itemInput.value.trim();
      if (!name) return;
      addSubjectItem(subject.id, name);
      itemInput.value = "";
    });
    addRow.append(itemInput, addButton);

    card.append(header, tags, addRow);
    els.subjectList.appendChild(card);
  });
}

function renderScheduleEditor() {
  els.scheduleEditor.innerHTML = "";

  weekDays.forEach((day) => {
    const subjectIds = state.schedule[day.key] ?? [];
    const wrapper = document.createElement("article");
    wrapper.className = "day-editor";

    const title = document.createElement("div");
    title.className = "day-editor-header";
    title.innerHTML = `
      <div class="day-editor-copy">
        <div class="subject-name">${day.label}</div>
        <div class="small-note">${subjectIds.length > 0 ? `已安排 ${subjectIds.length} 门课` : "这一天还没有科目"}</div>
      </div>
    `;

    const selected = document.createElement("div");
    selected.className = "day-editor-list";
    if (subjectIds.length > 0) {
      subjectIds.forEach((subjectId) => {
        const subject = getSubjectById(subjectId);
        if (!subject) return;
        const token = document.createElement("div");
        token.className = "token";
        token.innerHTML = `<span>${subject.name}</span>`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `从${day.label}删除${subject.name}`);
        remove.addEventListener("click", () => removeSubjectFromDay(day.key, subjectId));

        token.appendChild(remove);
        selected.appendChild(token);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "small-note";
      empty.textContent = "这一天还没有科目。";
      selected.appendChild(empty);
    }

    wrapper.append(title, selected);
    els.scheduleEditor.appendChild(wrapper);
  });
}

function renderScheduleForm() {
  els.scheduleDaySelect.innerHTML = "";
  weekDays.forEach((day) => {
    const option = document.createElement("option");
    option.value = day.key;
    option.textContent = day.label;
    els.scheduleDaySelect.appendChild(option);
  });

  els.scheduleSubjectSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.subjects.length > 0 ? "请选择一个科目" : "请先新增科目";
  els.scheduleSubjectSelect.appendChild(placeholder);

  state.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    els.scheduleSubjectSelect.appendChild(option);
  });

  els.scheduleSubjectSelect.disabled = state.subjects.length === 0;
}

function renderChecklistItem({ item, dateKey, checked, allowDelete }) {
  const fragment = els.checklistTemplate.content.cloneNode(true);
  const label = fragment.querySelector(".check-item");
  const input = fragment.querySelector("input");
  const name = fragment.querySelector(".item-name");
  const meta = fragment.querySelector(".item-meta");
  const remove = fragment.querySelector(".item-delete");

  input.checked = checked;
  label.classList.toggle("is-checked", checked);
  name.textContent = item.name;
  meta.textContent = item.meta;
  input.addEventListener("change", () => {
    label.classList.toggle("is-checked", input.checked);
    toggleChecked(dateKey, item.id, input.checked);
  });

  if (allowDelete) {
    remove.classList.remove("hidden");
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      deleteTemporaryItem(dateKey, item.id);
    });
  }

  return label;
}

function toggleChecked(dateKey, itemId, isChecked) {
  const current = new Set(state.checkedItems[dateKey] ?? []);
  if (isChecked) {
    current.add(itemId);
  } else {
    current.delete(itemId);
  }
  state.checkedItems[dateKey] = [...current];
  persistAndRender();
}

function buildChecklistForDateKey(dateKey, dayKey, previewOnly = false) {
  const subjectIds = state.schedule[dayKey] ?? [];
  const itemMap = new Map();

  subjectIds.forEach((subjectId) => {
    const subject = getSubjectById(subjectId);
    if (!subject) return;

    subject.items.forEach((name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (!itemMap.has(trimmed)) {
        itemMap.set(trimmed, {
          id: `subject:${trimmed}`,
          type: "subject",
          name: trimmed,
          subjects: [subject.name],
        });
      } else {
        itemMap.get(trimmed).subjects.push(subject.name);
      }
    });
  });

  const subjectItems = [...itemMap.values()].map((item) => ({
    ...item,
    meta: `来自：${unique(item.subjects).join("、")}`,
  }));

  if (previewOnly) {
    return subjectItems;
  }

  const temporaryItems = (state.temporaryItems[dateKey] ?? []).map((item) => ({
    ...item,
    type: "temporary",
    meta: "临时提醒",
  }));

  return [...subjectItems, ...temporaryItems];
}

function addSubjectItem(subjectId, name) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;
  if (subject.items.includes(name)) return;
  subject.items.push(name);
  persistAndRender();
}

function removeSubjectItem(subjectId, index) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;
  subject.items.splice(index, 1);
  persistAndRender();
}

function renameSubject(subjectId) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;

  const nextName = prompt("请输入新的科目名称", subject.name);
  if (!nextName) return;
  const trimmed = nextName.trim();
  if (!trimmed) return;
  subject.name = trimmed;
  persistAndRender();
}

function deleteSubject(subjectId) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;

  const usedDays = weekDays
    .filter((day) => (state.schedule[day.key] ?? []).includes(subjectId))
    .map((day) => day.label);

  const message = usedDays.length > 0
    ? `删除后会同时从 ${usedDays.join("、")} 移除这门课。确定要删除“${subject.name}”吗？`
    : `确定要删除“${subject.name}”吗？`;

  if (!confirm(message)) return;

  state.subjects = state.subjects.filter((item) => item.id !== subjectId);
  weekDays.forEach((day) => {
    state.schedule[day.key] = (state.schedule[day.key] ?? []).filter((id) => id !== subjectId);
  });
  persistAndRender();
}

function addSubjectToDay(dayKey, subjectId) {
  const list = state.schedule[dayKey] ?? [];
  list.push(subjectId);
  state.schedule[dayKey] = list;
  persistAndRender();
}

function removeSubjectFromDay(dayKey, subjectId) {
  const list = state.schedule[dayKey] ?? [];
  const index = list.lastIndexOf(subjectId);
  if (index === -1) return;
  list.splice(index, 1);
  persistAndRender();
}

function moveSubjectInDay(dayKey, subjectId, direction) {
  const list = state.schedule[dayKey] ?? [];
  const index = list.indexOf(subjectId);
  const nextIndex = index + direction;
  if (index === -1 || nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
  persistAndRender();
}

function scheduleDateRefresh() {
  if (dayRefreshTimer) {
    clearTimeout(dayRefreshTimer);
  }

  const now = new Date();
  const nextCheck = new Date(now);
  nextCheck.setHours(24, 0, 5, 0);
  const delay = Math.max(60 * 1000, nextCheck.getTime() - now.getTime());

  dayRefreshTimer = window.setTimeout(() => {
    render();
    scheduleDateRefresh();
  }, delay);
}

function deleteTemporaryItem(dateKey, itemId) {
  state.temporaryItems[dateKey] = (state.temporaryItems[dateKey] ?? []).filter((item) => item.id !== itemId);
  state.checkedItems[dateKey] = (state.checkedItems[dateKey] ?? []).filter((id) => id !== itemId);
  persistAndRender();
}

function getTargetDateInfo() {
  const now = new Date();
  const day = now.getDay();
  const targetDate = new Date(now);
  let banner = "后天视图";

  if (day >= 1 && day <= 3) {
    targetDate.setDate(now.getDate() + 2);
  } else if (day === 4 || day === 5 || day === 6 || day === 0) {
    let daysUntilMonday;
    if (day === 4) {
      daysUntilMonday = 4;
    } else if (day === 5) {
      daysUntilMonday = 3;
    } else if (day === 6) {
      daysUntilMonday = 2;
    } else {
      daysUntilMonday = 1;
    }
    targetDate.setDate(now.getDate() + daysUntilMonday);
    banner = day === 5 ? "周六晚自动切到下周一" : "下一次上课日";
  }

  const dayIndex = convertJsDayToWeekIndex(targetDate.getDay());
  const dayInfo = weekDays[dayIndex];

  return {
    banner,
    dayKey: dayInfo.key,
    dayLabel: dayInfo.label,
    dateText: formatDate(targetDate),
    dateKey: toDateKey(targetDate),
  };
}

function convertJsDayToWeekIndex(jsDay) {
  const map = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
  };
  return map[jsDay] ?? 0;
}

function getSubjectById(subjectId) {
  return state.subjects.find((subject) => subject.id === subjectId);
}

function splitItems(value) {
  return unique(
    value
      .split(/[\n,，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function unique(list) {
  return [...new Set(list)];
}

function setActiveTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  els.views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = structuredClone(defaultState);
      seeded.schedule.monday = [seeded.subjects[0].id, seeded.subjects[1].id];
      seeded.schedule.tuesday = [seeded.subjects[2].id, seeded.subjects[0].id];
      seeded.schedule.wednesday = [seeded.subjects[1].id];
      return seeded;
    }

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function button(label, className) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
