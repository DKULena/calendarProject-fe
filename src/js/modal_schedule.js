document.addEventListener("DOMContentLoaded", function () {
  const $modalScheduleView = document.querySelector(".modal-schedule-view");
  const $modalScheduleEdit = document.querySelector(".modal-schedule-edit");
  const $closeBtn = document.querySelector(".view-close-button");
  const $addBtn = document.querySelector(".view-add-button");
  const calendarMonthElement = document.querySelector(".calendar-month");
  const calendarYearElement = document.querySelector(".calendar-year");
  const $saveBtn = $modalScheduleEdit.querySelector("#save-btn");

  // let scheduleData = [];
  // let originalSchedule = null;
  // window.selectedScheduleId = null;

  document.body.addEventListener("click", function (event) {
    const clickedDay = event.target.closest("td");
    // console.log('--------------------this(clickedDay): -------------------- \n'+clickedDay);
    
    if (
      clickedDay &&
      (clickedDay.classList.contains("calendar-day") ||
        clickedDay.classList.contains("prev-month") ||
        clickedDay.classList.contains("next-month"))
    ) {
      let currentYear = parseInt(calendarYearElement.textContent);
      console.log('--------------------this(currentYear): -------------------- \n'+currentYear);
      let currentMonth = parseInt(calendarMonthElement.textContent) - 1; // 0-based month
      console.log('--------------------this(currentMonth): -------------------- \n'+currentMonth);
      let clickedDate = parseInt(clickedDay.textContent);
      console.log('--------------------this(clickedDate): -------------------- \n'+clickedDate);

      if (clickedDay.classList.contains("prev-month")) {
        if (currentMonth === 0) {
          currentYear--;
          currentMonth = 11;
        } else {
          currentMonth--;
        }
      } else if (clickedDay.classList.contains("next-month")) {
        if (currentMonth === 11) {
          currentYear++;
          currentMonth = 0;
        } else {
          currentMonth++;
        }
      }

      /*calendar ui에서 prev-month, nexy-month 로드 시
      updateCalendar함수를 가져오면서 충동.  
      */

      

      let targetDate = new Date(currentYear, currentMonth, clickedDate);
      console.log('--------------------this(targetDate): -------------------- \n'+targetDate);

      // 현재 날짜 업데이트
      window.currentDate = new Date(targetDate);

      // calendar.js의 updateCalendar 함수 호출
      if (typeof window.updateCalendar === "function") {
        window.updateCalendar();
      }

      // 모달 표시
      $modalScheduleView.style.display = "block";

      console.log("Selected date: ", targetDate.toDateString());
      updateModalContent(targetDate); // 모달 날짜 업데이트
      fetchScheduleData(targetDate); // 일정을 비동기로 불러오기
    }
  });

  $addBtn.addEventListener("click", function () {
    $modalScheduleEdit.style.display = "block";
  });

  const closeModal = () => {
    $modalScheduleView.style.display = "none";
    $modalScheduleEdit.style.display = "none";
  };


  // 조회 스케줄에서 이벤트 클릭했을 때
  window.addEventListener("click", function (event) {
    if (event.target === $modalScheduleView || event.target === $closeBtn) {
      closeModal();
    // --
    } else if (event.target.closest(".modal-view-box")) {
      const scheduleId =
        event.target.closest(".modal-view-box").dataset.scheduleId;
      const schedule = scheduleData.find(
        (s) => s.schedule_id === parseInt(scheduleId)
      );
      if (schedule) {
        window.selectedScheduleId = schedule.schedule_id;
        originalSchedule = { ...schedule }; // 원본 데이터를 전역 변수에 저장
        populateEditModal(schedule);
        $modalScheduleEdit.style.display = "block";
      }
    // --
    }
  });


  // 스케줄 조회 모달 날짜 업데이트
  function updateModalContent(date) {
    const $modalDateElement =
      $modalScheduleView.querySelector(".modal-view-date");
    if ($modalDateElement) {
      $modalDateElement.innerHTML = `
          <p class="view-year">${date.getFullYear()}</p>
          <p class="view-month">${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}</p>
          <span class="view-separator">/</span>
          <p class="view-day">${String(date.getDate()).padStart(2, "0")}</p>
        `;
    }
  }

  async function fetchScheduleData(date) {
    const $modalViewCont = $modalScheduleView.querySelector(".modal-view-cont");
    if (!$modalViewCont) return;
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      // scheduleData = data;
      console.log("Fetched data:", data);
  
      const filteredData = data.filter((schedule) => {
        const scheduleStart = new Date(schedule.schedule_start);
        const scheduleEnd = new Date(schedule.schedule_end);
  
        // 날짜 비교를 위해 시간 정보를 제거
        const scheduleDate = new Date(scheduleStart.getFullYear(), scheduleStart.getMonth(), scheduleStart.getDate());
        const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // 기본 일정(반복 없음)
        if (scheduleDate.getTime() === clickedDate.getTime() ||
            (clickedDate >= scheduleStart && clickedDate <= scheduleEnd)) {
          return true;
        }
  
        // 반복 일정 처리
        if (schedule.schedule_recurring && schedule.recurring_pattern) {
          const pattern = schedule.recurring_pattern;
          const startsOn = new Date(pattern.starts_on);
          const endsOn = new Date(pattern.ends_on);
  
          if (clickedDate >= startsOn && clickedDate <= endsOn) {
            switch (pattern.repeat_type) {
              case "daily":
                return ((clickedDate - startsOn) / (1000 * 60 * 60 * 24)) % pattern.repeat_interval === 0;
              case "weekly":
                const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][clickedDate.getDay()];
                return pattern.repeat_on.includes(dayOfWeek);
              case "monthly":
                return clickedDate.getDate() === startsOn.getDate();
              case "yearly":
                return (
                  clickedDate.getMonth() === startsOn.getMonth() &&
                  clickedDate.getDate() === startsOn.getDate()
                );
              default:
                return false;
            }
          }
        }
        return false;
      });
  
      if (filteredData.length > 0) {
        $modalViewCont.innerHTML = filteredData
          .map(
            (schedule) => `
            <div class="modal-view-box" data-schedule-id="${schedule.schedule_id}">
              <h3 class="modal-view-title">${schedule.schedule_title}</h3>
              <div class="modal-view-time">
                <span class="view-time-start">${formatTime(schedule.schedule_start)}</span>
                <span class="view-time-separator">~</span>
                <span class="view-time-end">${formatTime(schedule.schedule_end)}</span>
              </div>
              <p class="view-description">${schedule.schedule_description || ""}</p>
            </div>
          `
          )
          .join("");
      } else {
        $modalViewCont.innerHTML = "<p>조회 가능한 일정이 없습니다</p>";
      }
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      $modalViewCont.innerHTML = `<p>일정을 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
    }
  }

  function formatTime(timeString) {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function populateEditModal(schedule) {
    const startDate = new Date(schedule.schedule_start);
    const endDate = new Date(schedule.schedule_end);

    document.querySelector(
      ".modal-edit-container .modal-title"
    ).innerHTML = `<input type="text" id="editTitle" value="${schedule.schedule_title}" />`;
    document.querySelector(
      "#selectedDate"
    ).textContent = `${startDate.getFullYear()}년 ${
      startDate.getMonth() + 1
    }월 ${startDate.getDate()}일`;
    document.querySelector("#selectedTime").textContent = formatTime(
      schedule.schedule_start
    );
    document.querySelector(
      "#completeDate"
    ).textContent = `${endDate.getFullYear()}년 ${
      endDate.getMonth() + 1
    }월 ${endDate.getDate()}일`;
    document.querySelector("#completeTime").textContent = formatTime(
      schedule.schedule_end
    );
    document.querySelector(".textarea-container textarea").value =
      schedule.schedule_description || "";
  }
// --
  function getEditModalData() {
    const title = document.querySelector("#editTitle").value;
    const startDateText = document.querySelector("#selectedDate").textContent;
    const startTime = document.querySelector("#selectedTime").textContent;
    const endDateText = document.querySelector("#completeDate").textContent;
    const endTime = document.querySelector("#completeTime").textContent;
    const description = document.querySelector(
      ".textarea-container textarea"
    ).value;

    const startDate = formatDateTime(startDateText, startTime);
    const endDate = formatDateTime(endDateText, endTime);

    return {
      schedule_title: title,
      schedule_start: startDate,
      schedule_end: endDate,
      schedule_description: description,
    };
  }

  // "xxxx년 xx월 xx일" 및 "오전/오후 xx:xx"을 "YYYY-MM-DD HH:MM:SS" 형식으로 변환하는 함수
  function formatDateTime(dateText, timeText) {
    const [year, month, day] = dateText.match(/\d+/g);
    let [hour, minute] = timeText.match(/\d+/g);
    const period = timeText.includes("오전") ? "AM" : "PM";

    if (period === "PM" && hour !== "12") {
      hour = parseInt(hour) + 12;
    } else if (period === "AM" && hour === "12") {
      hour = "00";
    }

    hour = String(hour).padStart(2, "0");
    minute = String(minute).padStart(2, "0");

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour}:${minute}:00`;
  }
// --
  async function updateScheduleData(scheduleId, updatedData) {
    try {
      const updatedScheduleData = { ...originalSchedule, ...updatedData };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/schedule/${scheduleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedScheduleData),
        }
      );

      if (!response.ok) {
        throw new Error(`error status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Update response:", result);
      console.log("최신 데이터 받음");
      closeModal();
      await fetchData();
      updateCalendar();
    } catch (error) {
      console.error("Error updating schedule data:", error);
      alert(`오류 발생: ${error.message}`);
    }
  }
// --
  $saveBtn.addEventListener("click", function () {
    if (window.selectedScheduleId) {
      const updatedData = getEditModalData();

      // 시작 날짜와 끝나는 날짜를 비교하는 검증 로직 추가
      const startDate = new Date(updatedData.schedule_start);
      const endDate = new Date(updatedData.schedule_end);

      if (startDate > endDate) {
        alert("시작 날짜와 시간이 종료 날짜와 시간보다 이후일 수 없습니다.");
        return; // 검증에 실패하면 함수 종료
      }

      updateScheduleData(window.selectedScheduleId, updatedData);
    } else {
      alert("수정할 일정을 선택해주세요.");
    }
  });
});