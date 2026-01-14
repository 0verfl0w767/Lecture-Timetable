// Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-8E24NNDK21");

// DOM Elements
const courseList = document.getElementById("courseList");
const toggleButton = document.getElementById("toggleButton");
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

// State
let totalCredits = 0;
let selectedClasses = [];
let highlightedSections = [];
let currentIndex = -1;

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

// Course list management
function createCourseList() {
  const departments = {};
  courses.forEach((course) => {
    if (!departments[course["학부(과)"]]) {
      departments[course["학부(과)"]] = [];
    }
    departments[course["학부(과)"]].push(course);
  });

  for (const department in departments) {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentSelect.appendChild(option);
  }
  updateCourseList(courses);
}

function updateCourseList(filteredCourses) {
  filteredCourses.sort((a, b) => {
    if (a.학년 === b.학년) {
      return a.과목명.localeCompare(b.과목명);
    }
    return a.학년 - b.학년;
  });

  const departmentDiv = courseList.querySelector(".department-select");
  const courseItems = document.createElement("div");
  courseItems.className = "course-items";

  filteredCourses.forEach((course) => {
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

    firstLine.appendChild(courseName);
    secondLine.appendChild(courseNum);
    secondLine.appendChild(courseDepartment);
    secondLine.appendChild(courseGrade);
    secondLine.appendChild(courseTime);
    secondLine.appendChild(courseCredit);
    secondLine.appendChild(courseProfessor);
    if (course.비고) secondLine.appendChild(courseNotice);

    div.appendChild(firstLine);
    div.appendChild(secondLine);
    div.style.color = course.color;
    // 이벤트 위임으로 처리
    courseItems.appendChild(div);
  });

  const oldCourseItems = courseList.querySelector(".course-items");
  if (oldCourseItems) oldCourseItems.remove();

  courseList.appendChild(departmentDiv);
  courseList.appendChild(courseItems);
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
  selectedClasses.push(course);
  updateTimetable();

  const timeSlots = course.수업시간.split(",");

  if (
    timeSlots.length === 0 ||
    timeSlots[0] === "" ||
    timeSlots.some((slot) => slot.startsWith("일"))
  ) {
    const rows = document.querySelectorAll("#timetable tbody tr");
    const alreadyExists = [...rows].some((row) =>
      [...row.querySelectorAll("td")].some(
        (td) =>
          td.dataset.courseId && td.dataset.courseId.includes(course.강좌번호)
      )
    );

    if (alreadyExists) {
      alert("이미 선택한 과목이에요!");
      selectedClasses.pop();
      return;
    }

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.setAttribute("data-course-id", course.강좌번호);
    cell.style.backgroundColor = course.color;
    cell.textContent = `${course.과목명} (${course.교수명})`;
    row.appendChild(cell);
    document.querySelector("#timetable tbody").appendChild(row);

    row.onclick = () => {
      row.remove();
      selectedClasses = selectedClasses.filter(
        (c) => c.강좌번호 !== course.강좌번호
      );
      totalCredits -= parseInt(course.학점, 10);
      document.getElementById("creditValue").textContent = `${totalCredits}`;
    };

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
      `[${course.과목명}] 과목은 다른 과목이랑 시간이 겹쳐요!\n\n[${course.수업시간}] 에 추가할 수 없어요!`
    );
    selectedClasses.pop();
    return;
  }

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
        firstCell.innerHTML = `${course.과목명} <div class="detail">(${course.강좌번호}) (${course.교수명})</div>`;
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
        cell.innerHTML = `${course.과목명} <div class="detail">(${course.강좌번호}) (${course.교수명})</div>`;
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
          (course) => course.강좌번호 === courseId
        );

        if (courseToRemove) {
          selectedClasses = selectedClasses.filter(
            (course) => course.강좌번호 !== courseId
          );
          totalCredits -= parseInt(courseToRemove.학점, 10);
          document.getElementById(
            "creditValue"
          ).textContent = `${totalCredits}`;
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
              (td) => td.style.display === "none"
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
  const searchTerm = document.getElementById("searchText").value.toLowerCase();
  const sections = document.querySelectorAll(".course-item");

  sections.forEach((section) => {
    section.classList.remove("highlight");
  });

  if (!searchTerm) return;

  highlightedSections = [];
  currentIndex = -1;

  sections.forEach((section, index) => {
    const text = section.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      section.classList.add("highlight");
      highlightedSections.push(section);
    }
  });

  if (highlightedSections.length > 0) {
    currentIndex = 0;
    updateStatus();
    highlightedSections[currentIndex].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } else {
    document.getElementById("statusText").textContent = "0/0";
  }
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

  updateStatus();
  highlightedSections[currentIndex].scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function updateStatus() {
  document.getElementById("statusText").textContent = `${currentIndex + 1}/${
    highlightedSections.length
  }`;
}

function keyEnter() {
  if (event.key === "Enter") {
    const section = document.getElementById("courseList");
    section.style.transform = "";
    searchText();
  }
}

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
document.getElementById("downloadImageButton").onclick = () => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const timetable = document.getElementById("timetable");
  const rows = Array.from(timetable.rows).filter((row) => {
    const computedStyle = window.getComputedStyle(row);
    return computedStyle.display !== "none";
  });

  const rowHeight = 50;
  const firstRowHeight = 25;
  const defaultColumnWidth = 100;
  const firstColumnWidth = 25;

  const scale = window.devicePixelRatio || 1;
  canvas.width =
    (firstColumnWidth + defaultColumnWidth * (rows[0].cells.length - 1)) *
    scale;
  canvas.height =
    rows.reduce((totalHeight, row, index) => {
      return totalHeight + (index === 0 ? firstRowHeight : rowHeight);
    }, 0) * scale;

  canvas.style.width = `${
    firstColumnWidth + defaultColumnWidth * (rows[0].cells.length - 1)
  }px`;
  canvas.style.height = `${rows.reduce((totalHeight, row, index) => {
    return totalHeight + (index === 0 ? firstRowHeight : rowHeight);
  }, 0)}px`;

  context.scale(scale, scale);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 1;

  let currentY = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.cells;
    const currentRowHeight = i === 0 ? firstRowHeight : rowHeight;

    let currentX = 0;
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];

      if (cell.colSpan > 1) {
        context.fillStyle = cell.style.backgroundColor || "#fff";
        context.fillRect(
          j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth,
          currentY,
          cell.colSpan === 1
            ? firstColumnWidth
            : defaultColumnWidth * cell.colSpan,
          currentRowHeight
        );

        context.fillStyle = "white";
        context.font = `${cell.style.fontWeight} 12px ${cell.style.fontFamily}`;

        let text = cell.innerHTML;
        text = text.replace(/<div[^>]*>.*?<\/div>/g, "").trim();

        const textWidth = context.measureText(text).width;
        const x =
          (firstColumnWidth +
            defaultColumnWidth * (cell.colSpan - 1) -
            textWidth) /
          2;
        const y = currentY + currentRowHeight / 2 + 5;

        context.fillText(
          text,
          x + (j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth),
          y
        );
        j += cell.colSpan - 1;
        continue;
      }

      if (cell.rowSpan > 1) {
        for (let k = 0; k < cell.rowSpan; k++) {
          const rectY = currentY + k * currentRowHeight;
          context.fillStyle = cell.style.backgroundColor || "#fff";
          context.fillRect(
            j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth,
            rectY,
            cell.rowSpan === 1 ? firstColumnWidth : defaultColumnWidth,
            currentRowHeight
          );
        }

        context.strokeStyle = "#777";
        context.strokeRect(
          j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth,
          currentY,
          j === 0 ? firstColumnWidth : defaultColumnWidth,
          currentRowHeight
        );

        context.fillStyle = "white";
        context.font = `${cell.style.fontWeight} 12px ${cell.style.fontFamily}`;

        let text = cell.innerHTML;
        text = text.replace(/<div[^>]*>.*?<\/div>/g, "").trim();

        let lines = [];
        let currentLine = "";

        for (let char of text) {
          const testLine = currentLine + char;
          const testWidth = context.measureText(testLine).width;

          if (testWidth > (j === 0 ? firstColumnWidth : defaultColumnWidth)) {
            if (currentLine) {
              lines.push(currentLine);
            }
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);

        const lineHeight = 20;
        for (let k = 0; k < lines.length; k++) {
          const line = lines[k];
          const textWidth = context.measureText(line).width;
          const x =
            j === 0
              ? 5
              : firstColumnWidth +
                (j - 1) * defaultColumnWidth +
                (defaultColumnWidth - textWidth) / 2;
          const y =
            currentY +
            currentRowHeight / 2 +
            lineHeight * (k - (lines.length - 1) / 2) +
            5;

          context.fillText(line, x, y);
        }
        continue;
      }

      const computedStyle = window.getComputedStyle(cell);
      context.fillStyle = computedStyle.backgroundColor || "#fff";
      context.fillRect(
        j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth,
        currentY,
        j === 0 ? firstColumnWidth : defaultColumnWidth,
        currentRowHeight
      );

      context.strokeStyle = "#777";
      context.strokeRect(
        j === 0 ? 0 : firstColumnWidth + (j - 1) * defaultColumnWidth,
        currentY,
        j === 0 ? firstColumnWidth : defaultColumnWidth,
        currentRowHeight
      );

      context.fillStyle = computedStyle.color || "#000";
      context.font = `${computedStyle.fontWeight} 12px ${computedStyle.fontFamily}`;

      let text = cell.innerHTML;
      text = text.replace(/<div[^>]*>.*?<\/div>/g, "").trim();
      let lines = [];
      let currentLine = "";

      for (let char of text) {
        const testLine = currentLine + char;
        const testWidth = context.measureText(testLine).width;

        if (testWidth > (j === 0 ? firstColumnWidth : defaultColumnWidth)) {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const lineHeight = 20;
      for (let k = 0; k < lines.length; k++) {
        const line = lines[k];
        const textWidth = context.measureText(line).width;
        const x =
          j === 0
            ? 5
            : firstColumnWidth +
              (j - 1) * defaultColumnWidth +
              (defaultColumnWidth - textWidth) / 2;
        const y =
          currentY +
          currentRowHeight / 2 +
          lineHeight * (k - (lines.length - 1) / 2) +
          5;

        context.fillText(line, x, y);
      }

      currentX += j === 0 ? firstColumnWidth : defaultColumnWidth;
    }

    currentY += currentRowHeight;
  }

  const image = new Image();
  image.src = "https://www.syu.kr/assets/img/banner.png";
  image.crossOrigin = "Anonymous";

  image.onload = () => {
    const canvasMaxWidth = canvas.width;
    const canvasMaxHeight = canvas.height;

    let imgWidth = image.width;
    let imgHeight = image.height;

    const widthRatio = canvasMaxWidth / imgWidth;
    const heightRatio = canvasMaxHeight / imgHeight;
    const minRatio = Math.min(widthRatio, heightRatio);

    imgWidth *= minRatio;
    imgHeight *= minRatio;

    const x = (canvas.width - imgWidth) / 2;
    const y = (canvas.height - imgHeight) / 2;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 0.1;
    context.drawImage(image, x, y, imgWidth, imgHeight);
    context.globalAlpha = 1.0;

    const link = document.createElement("a");
    link.download = "timetable.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
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
let currentTranslate = 480;
const minBottom = 10;
const snapThreshold = 100;
const maxTranslate = 480;

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
  { passive: false }
);
panel.addEventListener("touchend", endDrag);

panel.addEventListener("mousedown", (e) => startDrag(e.clientY));
document.addEventListener("mousemove", (e) => moveDrag(e.clientY));
document.addEventListener("mouseup", endDrag);

// Department select
departmentSelect.onchange = () => {
  const selectedDepartment = departmentSelect.value;
  const filteredCourses = selectedDepartment
    ? courses.filter((course) => course["학부(과)"] === selectedDepartment)
    : courses;
  updateCourseList(filteredCourses);
};

// Share URL handling
function getTimetable() {
  const params = new URLSearchParams(window.location.search);
  const timetableParam = params.get("share");

  if (timetableParam) {
    const decoded = atob(timetableParam);
    setTimeout(() => {
      courses.forEach((course) => {
        if (JSON.parse(decoded).includes(course.강좌번호)) {
          highlightClass(course);
        }
      });
    }, 500);
  }
}

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

  // Initialize app
  initializeTimetableCells();
  initializeCellClickHandlers();
  getTimetable();

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

  // Fetch course data
  fetch("https://api.syu.kr/v1/lecture/timetable")
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
