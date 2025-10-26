import { useState, useEffect, useRef } from "react";
import "./App.css";
import Task from "./Task";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./Themetoggle";

// Storage functions
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);

    // Add validation for critical data structures
    if (key === "tasks") {
      // Ensure tasks is always an object with array values
      if (typeof parsed !== "object" || parsed === null) {
        return defaultValue;
      }
      // Clean up any non-array values
      Object.keys(parsed).forEach((listId) => {
        if (!Array.isArray(parsed[listId])) {
          parsed[listId] = [];
        }
      });
      return parsed;
    }

    if (key === "taskLists") {
      // Ensure taskLists is always an object with array values
      if (typeof parsed !== "object" || parsed === null) {
        return defaultValue;
      }
      return parsed;
    }

    return parsed;
  } catch (error) {
    console.error("Error loading from storage:", error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
};

// Helper function to get current date string
const getCurrentDateString = () => {
  const today = new Date();
  return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
};

// Helper function to compare dates
const isDateAfter = (date1, date2) => {
  const [day1, month1, year1] = date1.split("/").map(Number);
  const [day2, month2, year2] = date2.split("/").map(Number);

  const dateObj1 = new Date(year1, month1 - 1, day1);
  const dateObj2 = new Date(year2, month2 - 1, day2);

  return dateObj1 > dateObj2;
};

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

const formatDisplayDate = (dateString) => {
  try {
    const [day, month, year] = dateString.split("/").map(Number);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (month >= 1 && month <= 12) {
      return `${day}/${monthNames[month - 1].toUpperCase()}/${year}`;
    }

    return dateString;
  } catch (error) {
    return dateString;
  }
};

function App() {
  const taskGroupContainerRef = useRef(null);
  const isEditingRef = useRef(false);
  const isMobile = useIsMobile();

  // Add this at the beginning of your App component
  useEffect(() => {
    // Check if data structure is corrupted and reset if needed
    const tasksData = loadFromStorage("tasks", {});
    if (tasksData && typeof tasksData === "object") {
      let needsReset = false;
      Object.keys(tasksData).forEach((key) => {
        if (!Array.isArray(tasksData[key])) {
          needsReset = true;
        }
      });

      if (needsReset) {
        localStorage.removeItem("tasks");
        localStorage.removeItem("taskLists");
        localStorage.removeItem("newTaskGroup");
        localStorage.removeItem("listCategories");
        localStorage.removeItem("incompleteCounts");
        localStorage.removeItem("expandedStates");
        localStorage.removeItem("tasksExpandedStates");
        window.location.reload();
      }
    }
  }, []);

  // Initialize ALL state from localStorage
  const [newTaskGroup, setNewTaskGroup] = useState(() =>
    loadFromStorage("newTaskGroup", [])
  );
  const [taskLists, setTaskLists] = useState(() =>
    loadFromStorage("taskLists", {})
  );
  const [tasks, setTasks] = useState(() => loadFromStorage("tasks", {}));
  const [listCategories, setListCategories] = useState(() =>
    loadFromStorage("listCategories", {})
  );
  const [openCategories, setOpenCategories] = useState(null);
  const [incompleteCounts, setIncompleteCounts] = useState(() =>
    loadFromStorage("incompleteCounts", {})
  );
  const [expandedStates, setExpandedStates] = useState(() =>
    loadFromStorage("expandedStates", {})
  );
  const [tasksExpandedStates, setTasksExpandedStates] = useState(() =>
    loadFromStorage("tasksExpandedStates", {})
  );
  const [listCaptions, setListCaptions] = useState(() =>
    loadFromStorage("listCaptions", {})
  );
  const [editedCaptions, setEditedCaptions] = useState(() =>
    loadFromStorage("editedCaptions", {})
  );
  const [taskGroupCaptions, setTaskGroupCaptions] = useState(() =>
    loadFromStorage("taskGroupCaptions", {})
  );
  const [editedTaskGroupCaptions, setEditedTaskGroupCaptions] = useState(() =>
    loadFromStorage("editedTaskGroupCaptions", {})
  );

  // Save ALL data whenever ANY state changes
  useEffect(() => {
    saveToStorage("newTaskGroup", newTaskGroup);
    saveToStorage("taskLists", taskLists);
    saveToStorage("tasks", tasks);
    saveToStorage("listCategories", listCategories);
    saveToStorage("incompleteCounts", incompleteCounts);
    saveToStorage("expandedStates", expandedStates);
    saveToStorage("tasksExpandedStates", tasksExpandedStates);
    saveToStorage("listCaptions", listCaptions);
    saveToStorage("editedCaptions", editedCaptions);
    saveToStorage("taskGroupCaptions", taskGroupCaptions);
    saveToStorage("editedTaskGroupCaptions", editedTaskGroupCaptions);
  }, [
    newTaskGroup,
    taskLists,
    tasks,
    listCategories,
    incompleteCounts,
    expandedStates,
    tasksExpandedStates,
    listCaptions,
    editedCaptions,
    taskGroupCaptions,
    editedTaskGroupCaptions,
  ]);

  // Calculate incomplete tasks whenever tasks change
  useEffect(() => {
    const newIncompleteCounts = {};

    Object.keys(tasks).forEach((listId) => {
      const listTasks = tasks[listId] || [];
      const incomplete = listTasks.filter((task) => !task.checked).length;
      newIncompleteCounts[listId] = incomplete;
    });

    setIncompleteCounts(newIncompleteCounts);
  }, [tasks]);

  function updateTaskGroup() {
    const today = new Date();
    const taskDate = `${today.getDate()}/${
      today.getMonth() + 1
    }/${today.getFullYear()}`;

    const newTaskGroupItem = {
      id: Date.now(),
      date: taskDate,
    };

    // Add new task group to the beginning of the array
    setNewTaskGroup((prev) => [newTaskGroupItem, ...prev]);
  }

  const taskGroupByDate = newTaskGroup.reduce((groups, task) => {
    if (!groups[task.date]) {
      groups[task.date] = [];
    }
    groups[task.date].push(task);
    return groups;
  }, {});

  const dategroupArray = Object.entries(taskGroupByDate);

  // Use insertBefore to ensure new task groups appear at the top
  useEffect(() => {
    // Check if user is currently editing to avoid interrupting
    if (document.activeElement && document.activeElement.isContentEditable) {
      isEditingRef.current = true;
      return; // Don't reorder while user is editing
    }

    isEditingRef.current = false;

    if (taskGroupContainerRef.current && dategroupArray.length > 0) {
      const container = taskGroupContainerRef.current;
      const children = Array.from(container.children);

      // Reorder children based on the order in dategroupArray (newest first)
      children.sort((a, b) => {
        const aIndex = dategroupArray.findIndex(
          ([date]) => a.querySelector("h3").textContent === date
        );
        const bIndex = dategroupArray.findIndex(
          ([date]) => b.querySelector("h3").textContent === date
        );
        return aIndex - bIndex;
      });

      // Re-append children in correct order
      children.forEach((child) => container.appendChild(child));
    }
  }, [dategroupArray]);

  function deleteTaskGroup(datestring) {
    // Get all list IDs in this task group
    const listIds = taskLists[datestring]?.map((list) => list.id) || [];

    // Remove the task group from newTaskGroup
    setNewTaskGroup((prev) => prev.filter((task) => task.date !== datestring));

    // Remove the task group from taskLists
    setTaskLists((prev) => {
      const updated = { ...prev };
      delete updated[datestring];
      return updated;
    });

    // Remove all tasks associated with lists in this task group
    setTasks((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove list categories for lists in this task group
    setListCategories((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove list captions for lists in this task group
    setListCaptions((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove task group caption
    setTaskGroupCaptions((prev) => {
      const updated = { ...prev };
      delete updated[datestring];
      return updated;
    });

    // Remove incomplete counts for lists in this task group
    setIncompleteCounts((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove expanded states for lists in this task group
    setExpandedStates((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove tasks expanded states for lists in this task group
    setTasksExpandedStates((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });
  }

  function updatelist(datestring) {
    const newListId = Date.now();

    setTaskLists((prev) => ({
      ...prev,
      [datestring]: [...(prev[datestring] || []), { id: newListId }],
    }));

    setTasks((prev) => ({
      ...prev,
      [newListId]: [],
    }));

    setListCategories((prev) => ({
      ...prev,
      [newListId]: "categories",
    }));

    setIncompleteCounts((prev) => ({
      ...prev,
      [newListId]: 0,
    }));

    // Set new list to expanded by default
    setExpandedStates((prev) => ({
      ...prev,
      [newListId]: true,
    }));

    // Set new tasks container to expanded by default
    setTasksExpandedStates((prev) => ({
      ...prev,
      [newListId]: true,
    }));
  }

  function updatetask(listId) {
    const taskTime = new Date()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();

    const newTask = {
      id: Date.now(),
      time: taskTime,
      content: "Add task...",
      checked: false,
      dueDate: "",
      createdDate: getCurrentDateString(),
      lastEditedDate: getCurrentDateString(),
    };

    setTasks((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] || []), newTask],
    }));

    // Update incomplete count
    setIncompleteCounts((prev) => ({
      ...prev,
      [listId]: (prev[listId] || 0) + 1,
    }));
  }

  function deleteTask(listId, taskId) {
    setTasks((prev) => {
      // Ensure we have an array to filter
      const currentTasks = prev[listId];
      const tasksArray = Array.isArray(currentTasks) ? currentTasks : [];

      const updatedTasks = {
        ...prev,
        [listId]: tasksArray.filter((task) => task.id !== taskId),
      };

      // Update incomplete count after deletion
      const deletedTask = tasksArray.find((task) => task.id === taskId);
      if (deletedTask && !deletedTask.checked) {
        setIncompleteCounts((prevCounts) => ({
          ...prevCounts,
          [listId]: Math.max(0, (prevCounts[listId] || 0) - 1),
        }));
      }

      // Check if the list is now empty and delete it if so
      if (updatedTasks[listId].length === 0) {
        // Remove the list from taskLists
        setTaskLists((prevTaskLists) => {
          const updatedTaskLists = { ...prevTaskLists };
          Object.keys(updatedTaskLists).forEach((date) => {
            updatedTaskLists[date] = updatedTaskLists[date].filter(
              (list) => list.id !== listId
            );
            // Remove the date if it has no lists
            if (updatedTaskLists[date].length === 0) {
              delete updatedTaskLists[date];
            }
          });
          return updatedTaskLists;
        });

        // Remove the list from tasks
        delete updatedTasks[listId];

        // Remove the list from listCategories
        setListCategories((prevCategories) => {
          const updatedCategories = { ...prevCategories };
          delete updatedCategories[listId];
          return updatedCategories;
        });

        // Remove the list from incompleteCounts
        setIncompleteCounts((prevCounts) => {
          const updatedCounts = { ...prevCounts };
          delete updatedCounts[listId];
          return updatedCounts;
        });

        // Remove the list from expandedStates
        setExpandedStates((prevStates) => {
          const updatedStates = { ...prevStates };
          delete updatedStates[listId];
          return updatedStates;
        });

        // Remove the list from tasksExpandedStates
        setTasksExpandedStates((prevStates) => {
          const updatedStates = { ...prevStates };
          delete updatedStates[listId];
          return updatedStates;
        });
      }

      return updatedTasks;
    });
  }

  function updateTaskContent(listId, taskId, newContent) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              content: newContent,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));
  }

  function updateTaskChecked(listId, taskId, checked) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              checked: checked,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));

    // Update incomplete count when task checked status changes
    setIncompleteCounts((prev) => {
      const currentCount = prev[listId] || 0;
      if (checked) {
        // Task was marked as done
        return {
          ...prev,
          [listId]: Math.max(0, currentCount - 1),
        };
      } else {
        // Task was marked as not done
        return {
          ...prev,
          [listId]: currentCount + 1,
        };
      }
    });
  }

  function updateTaskDueDate(listId, taskId, dueDate) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueDate: dueDate,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));
  }

  function toggleCategories(listId) {
    setOpenCategories((prev) => (prev === listId ? null : listId));
  }

  function updatecategories(listId, category) {
    setListCategories((prev) => ({
      ...prev,
      [listId]: category,
    }));
    setOpenCategories(null);
  }

  function updateListCaption(listId, newCaption) {
    // If caption is empty, remove it from storage and mark as not edited
    if (!newCaption.trim()) {
      setListCaptions((prev) => {
        const updated = { ...prev };
        delete updated[listId];
        return updated;
      });

      setEditedCaptions((prev) => ({
        ...prev,
        [listId]: false,
      }));
    } else {
      // Only update if we have a non-empty caption
      setListCaptions((prev) => ({
        ...prev,
        [listId]: newCaption,
      }));

      // Mark this caption as edited
      setEditedCaptions((prev) => ({
        ...prev,
        [listId]: true,
      }));
    }
  }

  function updateTaskGroupCaption(datestring, newCaption) {
    // If caption is empty, remove it from storage and mark as not edited
    if (!newCaption.trim()) {
      setTaskGroupCaptions((prev) => {
        const updated = { ...prev };
        delete updated[datestring];
        return updated;
      });

      setEditedTaskGroupCaptions((prev) => ({
        ...prev,
        [datestring]: false,
      }));
    } else {
      // Only update if we have a non-empty caption
      setTaskGroupCaptions((prev) => ({
        ...prev,
        [datestring]: newCaption,
      }));

      // Mark this caption as edited
      setEditedTaskGroupCaptions((prev) => ({
        ...prev,
        [datestring]: true,
      }));
    }
  }

  // Toggle expand/collapse for all lists in a task group
  const toggleExpandCollapse = (datestring) => {
    const listIds = taskLists[datestring]?.map((list) => list.id) || [];
    const allExpanded = listIds.every((id) => expandedStates[id]);

    const newExpandedStates = { ...expandedStates };

    listIds.forEach((id) => {
      newExpandedStates[id] = !allExpanded;
    });

    setExpandedStates(newExpandedStates);
  };

  // Toggle expand/collapse for tasks container in a single list
  const toggleSingleTasks = (listId) => {
    setTasksExpandedStates((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  // Move task up or down
  const moveTask = (listId, taskId, direction) => {
    setTasks((prev) => {
      const currentTasks = prev[listId] || [];
      const currentIndex = currentTasks.findIndex((task) => task.id === taskId);

      if (
        (direction === "up" && currentIndex <= 0) ||
        (direction === "down" && currentIndex >= currentTasks.length - 1)
      ) {
        return prev;
      }

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      const newTasks = [...currentTasks];
      [newTasks[currentIndex], newTasks[newIndex]] = [
        newTasks[newIndex],
        newTasks[currentIndex],
      ];

      return {
        ...prev,
        [listId]: newTasks,
      };
    });
  };

  // Debug function to check storage
  const debugStorage = () => {
    console.log("Storage contents:");
    console.log("newTaskGroup:", loadFromStorage("newTaskGroup", []));
    console.log("taskLists:", loadFromStorage("taskLists", {}));
    console.log("tasks:", loadFromStorage("tasks", {}));
    console.log("listCategories:", loadFromStorage("listCategories", {}));
    console.log("incompleteCounts:", loadFromStorage("incompleteCounts", {}));
    console.log("expandedStates:", loadFromStorage("expandedStates", {}));
    console.log(
      "tasksExpandedStates:",
      loadFromStorage("tasksExpandedStates", {})
    );
  };

  // Clear all data
  const clearAllData = () => {
    localStorage.removeItem("newTaskGroup");
    localStorage.removeItem("taskLists");
    localStorage.removeItem("tasks");
    localStorage.removeItem("listCategories");
    localStorage.removeItem("listCaptions");
    localStorage.removeItem("taskGroupCaptions");
    localStorage.removeItem("incompleteCounts");
    localStorage.removeItem("expandedStates");
    localStorage.removeItem("tasksExpandedStates");
    setNewTaskGroup([]);
    setTaskLists({});
    setTasks({});
    setListCategories({});
    setListCaptions({});
    setTaskGroupCaptions({});
    setIncompleteCounts({});
    setExpandedStates({});
    setTasksExpandedStates({});
  };

  return (
    <>
      <div className="navbar">
        <ThemeToggle />
        <button className="addnewtaskgroupbutton" onClick={updateTaskGroup}>
          <i className="fa-solid fa-plus"></i>
        </button>
        <p
          className="desc"
          style={{
            margin: "0",
            padding: "0",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            marginTop: "25px",
            marginBottom: "55px",
          }}
        >
          Adds a daily task group
        </p>
      </div>

      <div ref={taskGroupContainerRef}>
        {dategroupArray.map(([datestring, groups]) => {
          // Calculate total incomplete tasks for this task group
          const listIds = taskLists[datestring]?.map((list) => list.id) || [];
          const totalIncomplete = listIds.reduce((total, listId) => {
            return total + (incompleteCounts[listId] || 0);
          }, 0);

          const taskGroupHasTasks = listIds.some(
            (listId) => tasks[listId]?.length > 0
          );

          return (
            <div key={datestring} className="taskgroupwrapper">
              <div className="taskgroup">
                <div className="topoflistdiv">
                  <h3>{formatDisplayDate(datestring)}</h3>

                  <button
                    className="createnewlistbtn"
                    onClick={() => updatelist(datestring)}
                  >
                    <i className="fa-regular fa-square-plus"></i>
                  </button>

                  <button
                    className="delete-task-group-btn"
                    onClick={() => deleteTaskGroup(datestring)}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>

                  <button
                    className="collapseexpandbtn"
                    onClick={() => toggleExpandCollapse(datestring)}
                  >
                    {taskLists[datestring]?.every(
                      (list) => expandedStates[list.id]
                    ) ? (
                      <i className="fa-solid fa-circle-chevron-up"></i>
                    ) : (
                      <i className="fa-solid fa-circle-chevron-down"></i>
                    )}
                  </button>
                </div>

                {/* TASK GROUP CAPTION AREA */}
                <div className="task-group-caption-div">
                  <p
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={(e) => {
                      if (e.target.textContent === "Add task group caption") {
                        e.target.textContent = "";
                      }
                    }}
                    onBlur={(e) => {
                      const newCaption = e.target.textContent.trim();

                      // Update the task group caption
                      updateTaskGroupCaption(datestring, newCaption);

                      // If empty, reset to placeholder text
                      if (!newCaption) {
                        e.target.textContent = "Add task group caption";
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    onClick={(e) => {
                      // Force focus on click for mobile devices
                      e.target.focus();

                      // For mobile: ensure proper cursor placement
                      if (window.getSelection && document.createRange) {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(e.target);
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                    }}
                    onTouchStart={(e) => {
                      // Prevent any default touch behavior that might interfere
                      e.preventDefault();
                      e.target.focus();

                      // For mobile: ensure proper cursor placement
                      setTimeout(() => {
                        if (window.getSelection && document.createRange) {
                          const selection = window.getSelection();
                          const range = document.createRange();
                          range.selectNodeContents(e.target);
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }, 100);
                    }}
                    style={{
                      color:
                        editedTaskGroupCaptions[datestring] &&
                        taskGroupCaptions[datestring] &&
                        taskGroupCaptions[datestring] !==
                          "Add task group caption"
                          ? "#4f46e5"
                          : "rgb(112, 111, 111)",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      WebkitUserSelect: "text",
                      userSelect: "text",
                      WebkitTapHighlightColor: "transparent",
                      minHeight: "20px",
                      minWidth: "200px",
                    }}
                  >
                    {taskGroupCaptions[datestring] || "Add task group caption"}
                  </p>
                </div>

                {/* Display total incomplete tasks for the task group */}
                {totalIncomplete > 0 && (
                  <div className="task-group-incomplete-count">
                    <p
                      style={{
                        color: "rgb(147, 145, 145)",
                        margin: "8px 0",
                        fontSize: "14px",
                      }}
                    >
                      ⚠️ Total incomplete: {totalIncomplete} task
                      {totalIncomplete !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {taskGroupHasTasks &&
                  listIds.length > 0 &&
                  totalIncomplete === 0 && (
                    <div className="task-group-incomplete-count">
                      <div className="small"></div>
                    </div>
                  )}

                {taskLists[datestring]?.map((list, index) => (
                  <motion.div
                    key={list.id}
                    className="list"
                    initial={{ height: 0, opacity: 0, padding: 0, margin: 0 }}
                    animate={{
                      height: expandedStates[list.id] ? "auto" : 0,
                      opacity: expandedStates[list.id] ? 1 : 0,
                      padding: expandedStates[list.id] ? "15px" : "0",
                      margin: expandedStates[list.id] ? "15px" : "0",
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{
                      overflow: "hidden",
                      border: expandedStates[list.id]
                        ? "2px solid var(--border-secondary)"
                        : "none",
                      backgroundColor: "var(--bg-tertiary)",
                      borderRadius: "10px",
                    }}
                  >
                    <div className="list-header">
                      <div className="topdiv">
                        <button
                          className="addtaskbtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            updatetask(list.id);
                          }}
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                        <div
                          className="categories"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategories(list.id);
                          }}
                        >
                          {listCategories[list.id] || "categories"}
                        </div>
                        <button
                          className="expand-collapse-list-btn"
                          onClick={() => toggleSingleTasks(list.id)}
                        >
                          {tasksExpandedStates[list.id] ? (
                            <i className="fa-solid fa-circle-chevron-up"></i>
                          ) : (
                            <i className="fa-solid fa-circle-chevron-down"></i>
                          )}
                        </button>
                      </div>

                      {/* LIST CAPTION AREA - KEPT AS BEFORE */}
                      <div className="captionsdiv">
                        <p
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={(e) => {
                            if (e.target.textContent === "Add caption") {
                              e.target.textContent = "";
                            }
                          }}
                          onBlur={(e) => {
                            const newCaption = e.target.textContent.trim();

                            // Update the caption (this will handle empty strings properly)
                            updateListCaption(list.id, newCaption);

                            // If empty, reset to placeholder text
                            if (!newCaption) {
                              e.target.textContent = "Add caption";
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.target.blur();
                            }
                          }}
                          style={{
                            color:
                              editedCaptions[list.id] &&
                              listCaptions[list.id] &&
                              listCaptions[list.id] !== "Add caption"
                                ? "#4f46e5"
                                : "rgb(112, 111, 111)",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                          }}
                        >
                          {listCaptions[list.id] || "Add caption"}
                        </p>
                      </div>

                      {openCategories === list.id && (
                        <div className="dropdowndiv">
                          <p
                            onClick={() =>
                              updatecategories(list.id, "🍉 Groceries")
                            }
                          >
                            🍉 Groceries
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "🛒 Shopping")
                            }
                          >
                            🛒 Shopping
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "✨ Personal")
                            }
                          >
                            ✨ Personal
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "📝 General")
                            }
                          >
                            📝 General
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "💡 Ideas")
                            }
                          >
                            💡 Ideas
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "📐 Project")
                            }
                          >
                            📐 Project
                          </p>
                          <p
                            onClick={() =>
                              updatecategories(list.id, "‼️ Important")
                            }
                          >
                            ‼️ Important
                          </p>
                        </div>
                      )}

                      {/* Display incomplete tasks message */}
                      <div className="task-status-message">
                        {incompleteCounts[list.id] > 0 ? (
                          <p style={{ color: "rgb(147, 145, 145)" }}>
                            ⚠️ You have {incompleteCounts[list.id]} incomplete
                            task
                            {incompleteCounts[list.id] !== 1 ? "s" : ""}
                          </p>
                        ) : (
                          tasks[list.id]?.length > 0 && (
                            <div className="smalldiv">
                              {" "}
                              <div className="small"></div>
                              <p style={{ color: "rgb(147, 145, 145)" }}>
                                All tasks completed!
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <motion.div
                      className="tasks-container"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: tasksExpandedStates[list.id] ? "auto" : 0,
                        opacity: tasksExpandedStates[list.id] ? 1 : 0,
                      }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden", margin: "0", padding: "0" }}
                    >
                      {tasks[list.id]?.map((task) => (
                        <div key={task.id} className="task-wrapper">
                          <Task
                            task={task}
                            onDelete={() => deleteTask(list.id, task.id)}
                            onUpdateContent={(newContent) =>
                              updateTaskContent(list.id, task.id, newContent)
                            }
                            onUpdateChecked={(checked) =>
                              updateTaskChecked(list.id, task.id, checked)
                            }
                            onUpdateDueDate={(dueDate) =>
                              updateTaskDueDate(list.id, task.id, dueDate)
                            }
                            onMoveUp={() => moveTask(list.id, task.id, "up")}
                            onMoveDown={() =>
                              moveTask(list.id, task.id, "down")
                            }
                            isMobile={isMobile}
                          />
                          {/* Show edited message if task was created/edited on a date after the task group date */}
                          {task.lastEditedDate &&
                            isDateAfter(task.lastEditedDate, datestring) && (
                              <div className="task-edited-message">
                                <span>Edited on {task.lastEditedDate}</span>
                              </div>
                            )}
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {dategroupArray.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          No task groups yet. Create above to get started!
        </div>
      )}
    </>
  );
}

export default App;
