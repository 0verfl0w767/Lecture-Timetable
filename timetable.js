// Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-8E24NNDK21");

// DOM Elements
const courseList = document.getElementById("courseList");
const departmentSelect = document.getElementById("departmentSelect");
const menuButton = document.getElementById("menuButton");
const menu = document.getElementById("menu");

// Data
const courses = [];
const timetableCells = {};
const days = ["월", "화", "수", "목", "금"];
const times = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
];

// List rendering
const COURSE_RENDER_BATCH = 200;
const AUTO_LOAD_THRESHOLD = 150;

// Render state
let currentFilteredCourses = [];
let renderedCourseCount = 0;
let courseItemsContainer = null;
let lastSearchTerm = "";
let isAutoLoading = false;

// State
let totalCredits = 0;
let selectedClasses = [];
let highlightedSections = [];
let currentIndex = -1;

// API base: use local proxy in file:// or localhost, else production
const API_BASE =
  location.protocol === "file:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://api.syu.kr";

// Initialize timetable cells
function initializeTimetableCells() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const row = cell.parentElement;
    const timeIndex = Array.from(row.children).indexOf(cell);
    const day = days[timeIndex - 1];
    const time = times[Array.from(row.parentElement.children).indexOf(row)];
    timetableCells[`${day}${time}`] = cell;
  });
}

// Utility functions
function getRandomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 93;
  const l = 93;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function addRandomColors() {
  courses.forEach((course) => {
    course.color = getRandomColor();
  });
}

function encodeJsonToBase64(json) {
  const jsonString = JSON.stringify(json);
  return btoa(jsonString);
}

function shareLink(json) {
  const base64Data = encodeJsonToBase64(json);
  const url = `https://lecture.syu.kr/timetable?share=${base64Data}`;
  return url;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Course list management
function createCourseList() {
  const departments = {};
  courses.forEach((course) => {
    if (!departments[course["학부(과)"]]) {
      departments[course["학부(과)"]] = [];
    }
    departments[course["학부(과)"]].push(course);
  });

  departmentSelect.innerHTML = '<option value="">전체 학부(과)</option>';
  for (const department in departments) {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentSelect.appendChild(option);
  }

  renderCourseListWithFilters();
}

function updateCourseList(filteredCourses, { resetScroll = true } = {}) {
  currentFilteredCourses = [...filteredCourses].sort((a, b) => {
    if (a.학년 === b.학년) {
      return a.과목명.localeCompare(b.과목명);
    }
    return a.학년 - b.학년;
  });

  const departmentDiv = courseList.querySelector(".department-select");
  const oldCourseItems = courseList.querySelector(".course-items");
  if (oldCourseItems) oldCourseItems.remove();

  courseItemsContainer = document.createElement("div");
  courseItemsContainer.className = "course-items";
  courseItemsContainer.addEventListener("scroll", handleCourseListScroll);
  if (departmentDiv && departmentDiv.nextSibling) {
    courseList.insertBefore(courseItemsContainer, departmentDiv.nextSibling);
  } else {
    courseList.appendChild(courseItemsContainer);
  }

  renderNextBatch({ reset: true });

  if (currentFilteredCourses.length === 0) {
    const noResult = document.createElement("div");
    noResult.className = "no-results";
    if (lastSearchTerm) {
      noResult.innerHTML = `“<strong>${escapeHtml(lastSearchTerm)}</strong>” 에 대한 검색 결과가 없어요.`;
    } else {
      noResult.textContent = "검색 결과가 없어요.";
    }
    courseItemsContainer.appendChild(noResult);
  }

  if (resetScroll) {
    courseList.scrollTop = 0;
    courseItemsContainer.scrollTop = 0;
  }
}

function createCourseItemElement(course) {
  const div = document.createElement("div");
  div.className = "course-item";
  div.dataset.courseId = course.강좌번호;

  const firstLine = document.createElement("div");
  firstLine.className = "first-line";
  const secondLine = document.createElement("div");
  secondLine.className = "second-line";

  const courseName = document.createElement("span");
  courseName.className = "course-name";
  courseName.textContent = course.과목명;

  const courseNum = document.createElement("span");
  courseNum.className = "course-num";
  courseNum.textContent = `강좌번호: ${course.강좌번호}`;

  const courseDepartment = document.createElement("span");
  courseDepartment.className = "course-depart";
  courseDepartment.textContent = `${course["학부(과)"]}`;

  const courseGrade = document.createElement("span");
  courseGrade.className = "course-grade";
  courseGrade.textContent = `${course.학년}학년`;

  const courseTime = document.createElement("span");
  courseTime.className = "course-time";
  courseTime.textContent = course.수업시간 || "?";

  const courseCredit = document.createElement("span");
  courseCredit.className = "course-credit";
  courseCredit.textContent = `${course.학점}학점` || "?";

  const courseProfessor = document.createElement("span");
  courseProfessor.className = "course-professor";
  courseProfessor.textContent = course.교수명 || "?";

  const courseNotice = document.createElement("span");
  courseNotice.className = "course-notice";
  courseNotice.textContent = course.비고;

  const courseType = document.createElement("span");
  courseType.className = "course-type";
  courseType.textContent = `${course.이수구분}`;

  firstLine.appendChild(courseName);
  secondLine.appendChild(courseNum);
  secondLine.appendChild(courseDepartment);
  secondLine.appendChild(courseGrade);
  secondLine.appendChild(courseTime);
  secondLine.appendChild(courseCredit);
  secondLine.appendChild(courseProfessor);
  if (course.비고) secondLine.appendChild(courseNotice);
  if (course.이수구분) secondLine.appendChild(courseType);

  div.appendChild(firstLine);
  div.appendChild(secondLine);
  div.style.color = course.color;
  return div;
}

function renderNextBatch({ reset = false } = {}) {
  if (!courseItemsContainer) return;

  if (reset) {
    courseItemsContainer.innerHTML = "";
    renderedCourseCount = 0;
  }

  const next = currentFilteredCourses.slice(
    renderedCourseCount,
    renderedCourseCount + COURSE_RENDER_BATCH,
  );

  next.forEach((course) => {
    const element = createCourseItemElement(course);
    courseItemsContainer.appendChild(element);
  });

  renderedCourseCount += next.length;
}

function handleCourseListScroll(event) {
  if (isAutoLoading) return;

  const scrollEl = event?.target || courseItemsContainer || courseList;
  if (!scrollEl) return;

  const hasMore = renderedCourseCount < currentFilteredCourses.length;
  if (!hasMore) return;

  const distanceToBottom =
    scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

  if (distanceToBottom <= AUTO_LOAD_THRESHOLD) {
    isAutoLoading = true;
    requestAnimationFrame(() => {
      renderNextBatch();
      refreshHighlights({ scroll: false });
      isAutoLoading = false;
    });
  }
}

function matchesSearchTerm(course, term) {
  if (!term) return true;

  const normalized = term.toLowerCase();
  const target =
    `${course.과목명} ${course.강좌번호} ${course["학부(과)"]} ${course.학년}학년 ${course.교수명} ${course.수업시간} ${course.학점}학점`.toLowerCase();
  return target.includes(normalized);
}

function renderCourseListWithFilters({ scrollHighlight = true } = {}) {
  const selectedDepartment = departmentSelect.value;
  const selectedGradeEls = Array.from(
    document.querySelectorAll(".grade-btn.active"),
  )
    .map((el) => el.dataset.grade)
    .filter((g) => g !== "");
  const selectedGrades = selectedGradeEls;
  const selectedTypes = Array.from(
    document.querySelectorAll(".type-btn.active"),
  ).map((el) => el.dataset.type);

  let baseCourses = selectedDepartment
    ? courses.filter((course) => course["학부(과)"] === selectedDepartment)
    : [...courses];

  if (selectedGrades && selectedGrades.length > 0) {
    baseCourses = baseCourses.filter((course) =>
      selectedGrades.includes(String(course.학년)),
    );
  }

  if (selectedTypes.length > 0) {
    baseCourses = baseCourses.filter((course) => {
      const typeField = (course.이수구분 || course["이수구분"] || "") + "";
      const norm = typeField.toString();
      return selectedTypes.some((t) => norm.indexOf(t) !== -1);
    });
  }

  const selectedDays = Array.from(
    document.querySelectorAll(".day-btn.active"),
  ).map((el) => el.dataset.day);
  if (selectedDays.length > 0) {
    baseCourses = baseCourses.filter((course) => {
      const timeField = (course.수업시간 || "") + "";
      return selectedDays.some((d) => timeField.indexOf(d) !== -1);
    });
  }

  const activeCreditBtns = Array.from(
    document.querySelectorAll(".credit-btn.active"),
  )
    .map((b) => b.dataset.credit)
    .filter((v) => v !== "");
  if (activeCreditBtns.length > 0) {
    const selectedCreditValues = activeCreditBtns
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    if (selectedCreditValues.length > 0) {
      baseCourses = baseCourses.filter((course) => {
        const c = Number(course.학점);
        return !Number.isNaN(c) && selectedCreditValues.includes(c);
      });
    }
  }

  const filtered = baseCourses.filter((course) =>
    matchesSearchTerm(course, lastSearchTerm),
  );

  updateCourseList(filtered);
  refreshHighlights({ scroll: scrollHighlight });
}

function refreshHighlights({ scroll = true } = {}) {
  highlightedSections = [];

  const sections = document.querySelectorAll(".course-item");
  sections.forEach((section) => {
    if (lastSearchTerm) {
      section.classList.add("highlight");
      highlightedSections.push(section);
    } else {
      section.classList.remove("highlight");
    }
  });

  if (lastSearchTerm && highlightedSections.length > 0) {
    currentIndex = 0;
    // updateStatus();
    if (scroll) {
      highlightedSections[0].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  } else {
    currentIndex = -1;
    // document.getElementById("statusText").textContent = "0/0";
  }
}

// Timetable management
function updateTimetable() {
  let maxClass = 0;

  selectedClasses.forEach((course) => {
    const timeSlots = course.수업시간.split(",");
    timeSlots.forEach((slot) => {
      const day = slot.charAt(0);
      if (day === "일") return;
      const timeRange = slot.slice(1);
      if (timeRange.includes("~")) {
        const [startTime, endTime] = timeRange.split("~").map(Number);
        maxClass = Math.max(maxClass, endTime);
      } else {
        maxClass = Math.max(maxClass, Number(timeRange));
      }
    });
  });

  const rows = document.querySelectorAll("#timetable tbody tr");
  rows.forEach((row, index) => {
    if (index >= maxClass) {
      // row.style.display = "none";
    } else {
      row.style.display = "table-row";
    }
  });
}

function highlightClass(course) {
  // 중복 체크를 먼저 수행
  const alreadyExists = selectedClasses.some(
    (c) => c.강좌번호 === course.강좌번호,
  );

  if (alreadyExists) {
    alert("이미 선택한 과목이에요!");
    return;
  }

  const timeSlots = course.수업시간.split(",");

  if (
    timeSlots.length === 0 ||
    timeSlots[0] === "" ||
    timeSlots.some((slot) => slot.startsWith("일"))
  ) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.setAttribute("data-course-id", course.강좌번호);
    cell.style.backgroundColor = course.color;
    const profName =
      course.교수명 && course.교수명.trim() ? course.교수명 : "미지정";
    cell.textContent = `${course.과목명} (${profName})`;
    row.appendChild(cell);
    document.querySelector("#timetable tbody").appendChild(row);

    row.onclick = () => {
      row.remove();
      selectedClasses = selectedClasses.filter(
        (c) => c.강좌번호 !== course.강좌번호,
      );
      totalCredits -= parseInt(course.학점, 10);
      document.getElementById("creditValue").textContent = `${totalCredits}`;
    };

    selectedClasses.push(course);
    totalCredits += parseInt(course.학점, 10);
    document.getElementById("creditValue").textContent = `${totalCredits}`;
    return;
  }

  let conflict = false;
  timeSlots.forEach((slot) => {
    const day = slot.charAt(0);
    const timeRange = slot.slice(1);
    if (timeRange.includes("~")) {
      const [startTime, endTime] = timeRange.split("~").map(Number);
      for (let i = startTime; i <= endTime; i++) {
        const cellKey = `${day}${i}`;
        const cell = timetableCells[cellKey];
        if (cell.style.display === "none" || cell.style.backgroundColor) {
          conflict = true;
        }
      }
    } else {
      const cellKey = `${day}${timeRange}`;
      const cell = timetableCells[cellKey];
      if (cell.style.display === "none" || cell.style.backgroundColor) {
        conflict = true;
      }
    }
  });

  if (conflict) {
    alert(
      `[${course.과목명}] 과목은 다른 과목이랑 시간이 겹쳐요!\n\n[${course.수업시간}] 에 추가할 수 없어요!`,
    );
    return;
  }

  selectedClasses.push(course);
  updateTimetable();

  timeSlots.forEach((slot) => {
    const day = slot.charAt(0);
    const timeRange = slot.slice(1);

    if (timeRange.includes("~")) {
      const [startTime, endTime] = timeRange.split("~").map(Number);
      const firstCellKey = `${day}${startTime}`;
      const firstCell = timetableCells[firstCellKey];

      if (firstCell) {
        firstCell.setAttribute("data-course-id", course.강좌번호);
        firstCell.style.backgroundColor = course.color;
        const profName =
          course.교수명 && course.교수명.trim() ? course.교수명 : "미지정";
        const rawPlace = course.장소 && course.장소.trim() ? course.장소 : "";
        // Support multiple locations separated by comma/、/;/ or / : split and normalize each segment.
        const placesArray = rawPlace
          .split(/\s*[,、\/;]\s*/)
          .map((seg) =>
            seg
              .replace(/강의실/gi, "")
              .replace(/\s*[\(\（][^\)\）]*[\)\）]/g, "")
              .replace(/호.*/, "호")
              .trim(),
          )
          .filter(Boolean);
        let placeText = placesArray.join(", ");
        let placeHtml = placesArray.map(escapeHtml).join(",<br>");
        if (placeText === "미지정") placeText = "";
        firstCell.innerHTML = `${course.과목명} <div class="detail"><div class="meta">${course.강좌번호}·${profName}</div><div class="place" title="${escapeHtml(placeText)}">${placeHtml}</div></div>`;
        firstCell.setAttribute("rowspan", endTime - startTime + 1);
      }

      for (let i = startTime + 1; i <= endTime; i++) {
        const cellKey = `${day}${i}`;
        const cell = timetableCells[cellKey];
        if (cell) {
          cell.style.display = "none";
        }
      }
    } else {
      const cellKey = `${day}${timeRange}`;
      const cell = timetableCells[cellKey];
      if (cell) {
        cell.setAttribute("data-course-id", course.강좌번호);
        cell.style.backgroundColor = course.color;
        const profName =
          course.교수명 && course.교수명.trim() ? course.교수명 : "미지정";
        const rawPlace = course.장소 && course.장소.trim() ? course.장소 : "";
        // Support multiple locations separated by comma/、/;/ or / : split and normalize each segment.
        const placesArray = rawPlace
          .split(/\s*[,、\/;]\s*/)
          .map((seg) =>
            seg
              .replace(/강의실/gi, "")
              .replace(/\s*[\(\（][^\)\）]*[\)\）]/g, "")
              .replace(/호.*/, "호")
              .trim(),
          )
          .filter(Boolean);
        let placeText = placesArray.join(", ");
        let placeHtml = placesArray.map(escapeHtml).join(",<br>");
        if (placeText === "미지정") placeText = "";
        cell.innerHTML = `${course.과목명} <div class="detail"><div class="meta">${course.강좌번호}·${profName}</div><div class="place" title="${escapeHtml(placeText)}">${placeHtml}</div></div>`;
      }
    }
  });

  totalCredits += parseInt(course.학점, 10);
  document.getElementById("creditValue").textContent = `${totalCredits}`;
}

// Cell click handlers
function initializeCellClickHandlers() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    cell.onclick = () => {
      const courseId = cell.dataset.courseId;

      if (courseId) {
        const courseToRemove = courses.find(
          (course) => course.강좌번호 === courseId,
        );

        if (courseToRemove) {
          selectedClasses = selectedClasses.filter(
            (course) => course.강좌번호 !== courseId,
          );
          totalCredits -= parseInt(courseToRemove.학점, 10);
          document.getElementById("creditValue").textContent =
            `${totalCredits}`;
        }

        cells.forEach((innerCell) => {
          if (innerCell.dataset.courseId === courseId) {
            const timeSlots = courseToRemove.수업시간.split(",");
            timeSlots.forEach((slot) => {
              const day = slot.charAt(0);
              const timeRange = slot.slice(1);
              if (timeRange.includes("~")) {
                const [startTime, endTime] = timeRange.split("~").map(Number);
                for (let i = startTime + 1; i <= endTime; i++) {
                  const cellKey = `${day}${i}`;
                  const cell = timetableCells[cellKey];
                  if (cell) {
                    cell.style.display = "table-cell";
                  }
                }
              }
            });

            innerCell.removeAttribute("data-course-id");
            innerCell.removeAttribute("style");
            innerCell.removeAttribute("rowspan");
            innerCell.textContent = "";
          }
        });

        for (let i = 16; i >= 8; i--) {
          const row = document.querySelector(`tr:nth-child(${i})`);
          if (row) {
            const isEmpty = Array.from(row.children)
              .slice(1)
              .every((td) => !td.textContent.trim());
            const isRowspan = Array.from(row.children).some(
              (td) => td.style.display === "none",
            );

            if (isRowspan) {
              break;
            }

            if (!isEmpty) {
              break;
            }

            row.style.display = "none";
          }
        }
      }
    };
  });
}

// Search functionality
function searchText() {
  lastSearchTerm = document
    .getElementById("searchText")
    .value.trim()
    .toLowerCase();
  renderCourseListWithFilters();
}

function navigate(direction) {
  if (highlightedSections.length === 0) return;

  if (direction === "prev" && currentIndex > 0) {
    currentIndex--;
  } else if (
    direction === "next" &&
    currentIndex < highlightedSections.length - 1
  ) {
    currentIndex++;
  }

  // updateStatus();
  highlightedSections[currentIndex].scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// function updateStatus() {
//   document.getElementById("statusText").textContent = `${currentIndex + 1}/${
//     highlightedSections.length
//   }`;
// }

// Share functionality
document.getElementById("shareButton").onclick = () => {
  navigator.clipboard
    .writeText(shareLink(selectedClasses.map((course) => course.강좌번호)))
    .then(() => {
      alert("링크를 복사했어요!");
    })
    .catch((err) => {
      console.error("링크 복사에 실패했어요!");
    });
};

// Download functionality
document.getElementById("downloadImageButton").onclick = async () => {
  const target = document.getElementById("timetable");

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {}

  const options = {
    backgroundColor: "#ffffff",
    pixelRatio: Math.max(2, window.devicePixelRatio || 1),
    cacheBust: true,
    style: {
      width: target.offsetWidth + "px",
      height: target.offsetHeight + "px",
    },
    skipFonts: false,
    preferCanvas: true,
  };

  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

  try {
    const dataUrl = await htmlToImage.toPng(target, options);

    // if (navigator.canShare && window.File) {
    //   try {
    //     const blob = dataURLtoBlob(dataUrl);
    //     const file = new File([blob], "timetable.png", { type: blob.type });
    //     if (navigator.canShare({ files: [file] })) {
    //       await navigator.share({ files: [file], title: "Timetable" });
    //       return;
    //     }
    //   } catch (e) {}
    // }

    if (isIOS) {
      if (navigator.canShare && window.File) {
        try {
          const blob = dataURLtoBlob(dataUrl);
          const file = new File([blob], "timetable.png", { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Timetable" });
            return;
          }
        } catch (e) {}
      }
    }

    const link = document.createElement("a");
    link.download = "timetable.png";
    link.href = dataUrl;
    link.rel = "noopener";
    link.click();
  } catch (err) {
    console.error("이미지 저장 중 오류:", err);
    alert("이미지 변환에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
};

// Menu functionality
menuButton.onclick = () => {
  const isVisible = menu.classList.contains("show");
  menu.classList.toggle("show", !isVisible);
};

document.addEventListener("click", (event) => {
  const isMenuVisible = menu.classList.contains("show");
  const isClickInsideMenu = menu.contains(event.target);
  const isClickOnButton = menuButton.contains(event.target);

  if (isMenuVisible && !isClickInsideMenu && !isClickOnButton) {
    menu.classList.remove("show");
  }
});

// Drag functionality
const panel = document.getElementById("courseList");
let dragging = false;
let startY = 0;
let currentTranslate = 445;
const minBottom = 10;
const snapThreshold = 100;
const maxTranslate = 445;

panel.style.transform = `translateY(${currentTranslate}px)`;

function startDrag(clientY) {
  dragging = true;
  startY = clientY;
  panel.style.transition = "none";
}

function moveDrag(clientY) {
  if (!dragging) return;

  let diff = clientY - startY;
  let newTranslate = currentTranslate + diff;

  if (newTranslate < 0) newTranslate = 0;
  if (newTranslate > maxTranslate) newTranslate = maxTranslate;

  panel.style.transform = `translateY(${newTranslate}px)`;
}

function endDrag() {
  if (!dragging) return;
  dragging = false;

  const style = window.getComputedStyle(panel);
  const matrix = new DOMMatrixReadOnly(style.transform);
  currentTranslate = matrix.m42;

  const middle = maxTranslate / 2;
  if (currentTranslate < middle) {
    currentTranslate = 0;
  } else {
    currentTranslate = maxTranslate;
  }

  panel.style.transition = "transform 0.2s ease";
  panel.style.transform = `translateY(${currentTranslate}px)`;
}

panel.addEventListener("touchstart", (e) => startDrag(e.touches[0].clientY));
panel.addEventListener(
  "touchmove",
  (e) => {
    if (
      e.target.closest(".department-select") ||
      e.target.closest(".course-items")
    )
      return;
    moveDrag(e.touches[0].clientY);
    e.preventDefault();
  },
  { passive: false },
);
panel.addEventListener("touchend", endDrag);

panel.addEventListener("mousedown", (e) => startDrag(e.clientY));
document.addEventListener("mousemove", (e) => moveDrag(e.clientY));
document.addEventListener("mouseup", endDrag);

// Department select
departmentSelect.onchange = () => {
  renderCourseListWithFilters({ scrollHighlight: false });
};

// Cookie management
function getCookie(name) {
  const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value;
    return acc;
  }, {});
  return cookies[name] || null;
}

// Load timetable from encoded data
function loadFromEncoded(encoded) {
  try {
    const decoded = atob(encoded);
    const courseIds = JSON.parse(decoded);
    courseIds.forEach((id) => {
      const course = courses.find((c) => c.강좌번호 === id);
      if (course) highlightClass(course);
    });
  } catch (e) {
    console.error("데이터 로드 실패:", e);
  }
}

// Get timetable from URL or cookie
function getTimetable() {
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get("share");

  if (shareParam) {
    // share url first
    setTimeout(() => {
      loadFromEncoded(shareParam);
    }, 500);
  } else {
    const cookieData = getCookie("data");
    if (cookieData && cookieData !== "W10%3D") {
      if (confirm("이전에 저장된 데이터를 불러올까요?")) {
        setTimeout(() => {
          loadFromEncoded(cookieData);
        }, 500);
      } else {
        document.cookie =
          "data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  }
}

// Auto-save to cookie on page unload
window.addEventListener("beforeunload", () => {
  if (selectedClasses.length > 0) {
    const encoded = encodeJsonToBase64(selectedClasses.map((c) => c.강좌번호));
    document.cookie = `data=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }
});

// Modal
window.onload = () => {
  const modal = document.getElementById("welcomeModal");
  const closeButton = document.querySelector(".close-button");

  modal.style.display = "block";
  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  closeButton.onclick = () => {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 500);
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
      }, 500);
    }
  };

  // Detail options modal handlers
  const detailButton = document.getElementById("detailOptionsButton");
  const detailModal = document.getElementById("detailModal");
  const optionsClose = document.querySelector(".options-close-button");
  const applyButton = document.getElementById("applyDetailOptions");

  if (detailButton && detailModal) {
    detailButton.onclick = () => {
      detailModal.style.display = "block";
      setTimeout(() => detailModal.classList.add("show"), 10);
    };
  }

  if (optionsClose && detailModal) {
    optionsClose.onclick = () => {
      detailModal.classList.remove("show");
      setTimeout(() => {
        detailModal.style.display = "none";
      }, 500);
    };
  }

  if (detailModal) {
    detailModal.addEventListener("click", (e) => {
      if (e.target === detailModal) {
        detailModal.classList.remove("show");
        setTimeout(() => {
          detailModal.style.display = "none";
        }, 500);
      }
    });
  }

  if (applyButton) {
    applyButton.onclick = () => {
      try {
        // 옵션 적용 시 검색 입력값을 현재 상태로 동기화하도록
        // 입력을 비우고 옵션만 적용하면 이전 검색어가 남아 결과가 필터링되지 않는 문제를 방지함.
        lastSearchTerm = document
          .getElementById("searchText")
          .value.trim()
          .toLowerCase();
        renderCourseListWithFilters({ scrollHighlight: true });
      } catch (e) {
        console.error("필터 적용 중 오류:", e);
      }

      detailModal.classList.remove("show");
      setTimeout(() => {
        detailModal.style.display = "none";
      }, 500);
    };
  }

  (function setupGradeToggle() {
    const gradeButtons = document.querySelectorAll(".grade-btn");
    if (!gradeButtons || gradeButtons.length === 0) return;

    const allBtn = document.querySelector('.grade-btn[data-grade=""]');

    gradeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.grade === "") {
          gradeButtons.forEach((b) => {
            if (b !== btn) {
              b.classList.remove("active");
              b.setAttribute("aria-pressed", "false");
            }
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          return;
        }

        const isActive = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");

        const any = Array.from(gradeButtons).some(
          (b) => b.dataset.grade !== "" && b.classList.contains("active"),
        );
        if (any) {
          if (allBtn) {
            allBtn.classList.remove("active");
            allBtn.setAttribute("aria-pressed", "false");
          }
        } else {
          if (allBtn) {
            allBtn.classList.add("active");
            allBtn.setAttribute("aria-pressed", "true");
          }
        }
      });
    });
  })();

  // Type toggle interaction: multi-select buttons
  (function setupTypeToggle() {
    const typeButtons = document.querySelectorAll(".type-btn");
    if (!typeButtons || typeButtons.length === 0) return;

    typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  })();

  // Day toggle interaction: multi-select weekday buttons
  (function setupDayToggle() {
    const dayButtons = document.querySelectorAll(".day-btn");
    if (!dayButtons || dayButtons.length === 0) return;

    dayButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  })();

  (function setupCreditButtons() {
    const buttons = document.querySelectorAll(".credit-btn");
    if (!buttons || buttons.length === 0) return;

    const allBtn = document.querySelector('.credit-btn[data-credit=""]');

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.credit === "") {
          buttons.forEach((b) => {
            if (b !== btn) {
              b.classList.remove("active");
              b.setAttribute("aria-pressed", "false");
            }
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          return;
        }

        const isActive = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");

        const any = Array.from(buttons).some(
          (b) => b.dataset.credit !== "" && b.classList.contains("active"),
        );
        if (any) {
          if (allBtn) {
            allBtn.classList.remove("active");
            allBtn.setAttribute("aria-pressed", "false");
          }
        } else {
          if (allBtn) {
            allBtn.classList.add("active");
            allBtn.setAttribute("aria-pressed", "true");
          }
        }
      });
    });
  })();

  // Equalize widths of filter groups to match the 'type' group
  function equalizeFilterGroupWidths() {
    const ref = document.querySelector(".type-toggle");
    if (!ref) return;
    const width = ref.offsetWidth;
    const groups = document.querySelectorAll(
      ".grade-toggle.segmented, .day-toggle.segmented, .credit-buttons.segmented",
    );
    groups.forEach((g) => {
      g.style.width = width + "px";
    });
  }

  // Recompute on resize
  window.addEventListener("resize", () => {
    setTimeout(equalizeFilterGroupWidths, 80);
  });

  // Run when modal opens so widths are correct
  if (detailButton && detailModal) {
    const prevHandler = detailButton.onclick;
    detailButton.onclick = () => {
      if (typeof prevHandler === "function") prevHandler();
      setTimeout(equalizeFilterGroupWidths, 40);
    };
  }

  setTimeout(equalizeFilterGroupWidths, 120);

  // Initialize app
  initializeTimetableCells();
  initializeCellClickHandlers();
  getTimetable();

  // Search input Enter key handler
  document.getElementById("searchText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const section = document.getElementById("courseList");
      section.style.transform = "";
      searchText();
    }
  });

  // Make search icon clickable
  const searchIcon = document.querySelector(".search-wrapper .search-icon");
  if (searchIcon) {
    searchIcon.addEventListener("click", () => {
      const section = document.getElementById("courseList");
      section.style.transform = "";
      searchText();
      document.getElementById("searchText").focus();
    });

    searchIcon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        searchIcon.click();
      }
    });
  }

  // Event delegation for course items
  courseList.addEventListener("click", (e) => {
    const courseItem = e.target.closest(".course-item");
    if (courseItem) {
      const courseId = courseItem.dataset.courseId;
      const course = courses.find((c) => c.강좌번호 === courseId);
      if (course) {
        highlightClass(course);
      }
    }
  });

  // Auto-load more on scroll
  courseList.addEventListener("scroll", handleCourseListScroll);

  // Fetch course data (via local proxy in dev)
  fetch(`${API_BASE}/v1/lecture/timetable`)
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("time").textContent = data.api.time;
      courses.push(...data.api.api);
      addRandomColors();
      createCourseList();
    })
    .catch((error) => {
      console.error("강의 데이터를 불러오는데 실패했어요:", error);
    });
};
