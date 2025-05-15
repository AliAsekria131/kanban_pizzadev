// Firebase SDK Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAg_od40W0g477isds61y9BVrlmKo7-1LY", // Keep the original API key
  authDomain: "kanban-pizzadev.firebaseapp.com",
  projectId: "kanban-pizzadev",
  storageBucket: "kanban-pizzadev.firebasestorage.app",
  messagingSenderId: "303784063094",
  appId: "1:303784063094:web:93cd91dce5cd33d7d1af57",
  measurementId: "G-RKSYV53YG5",
  databaseURL: "https://kanban-pizzadev-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const authSection = document.getElementById("auth-section");
const loginContainer = document.getElementById("login-container");
const signupContainer = document.getElementById("signup-container");

const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");
const showSignupButton = document.getElementById("show-signup");

const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupConfirmPasswordInput = document.getElementById("signup-confirm-password");
const signupButton = document.getElementById("signup-button");
const signupMessage = document.getElementById("signup-message");
const showLoginButton = document.getElementById("show-login");

const kanbanApp = document.getElementById("kanban-app");
const welcomeMessage = document.getElementById("welcome-message");
const logoutButton = document.getElementById("logout-button");
const boardDiv = document.getElementById("board");

const defaultColumns = ["todo", "doing", "done"];
let currentUserId = null;
let tasksListeners = {}; // To keep track of listeners and detach them on logout

// --- Authentication State Observer ---
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in
    currentUserId = user.uid;
    authSection.style.display = "none";
    kanbanApp.style.display = "block";
    logoutButton.style.display = "block";
    welcomeMessage.textContent = `مرحباً، ${user.email}`;
    welcomeMessage.style.display = "block";
    loadUserKanbanData(currentUserId);
  } else {
    // User is signed out
    currentUserId = null;
    authSection.style.display = "block";
    loginContainer.style.display = "block"; // Default to login form
    signupContainer.style.display = "none";
    kanbanApp.style.display = "none";
    logoutButton.style.display = "none";
    welcomeMessage.style.display = "none";
    boardDiv.innerHTML = ""; // Clear the board
    loginMessage.textContent = "";
    signupMessage.textContent = "";
    // Detach any active Firebase listeners for tasks
    Object.keys(tasksListeners).forEach(column => {
      if (tasksListeners[column]) {
        tasksListeners[column].off();
      }
    });
    tasksListeners = {};
  }
});

// --- Event Listeners for Auth UI Toggling ---
showSignupButton.addEventListener("click", () => {
  loginContainer.style.display = "none";
  signupContainer.style.display = "block";
  loginMessage.textContent = "";
});

showLoginButton.addEventListener("click", () => {
  signupContainer.style.display = "none";
  loginContainer.style.display = "block";
  signupMessage.textContent = "";
});

// --- Signup Functionality ---
signupButton.addEventListener("click", () => {
  const email = signupEmailInput.value;
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmPasswordInput.value;

  if (password !== confirmPassword) {
    signupMessage.textContent = "كلمتا المرور غير متطابقتين.";
    return;
  }
  if (password.length < 6) {
    signupMessage.textContent = "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      signupMessage.textContent = "تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...";
      // onAuthStateChanged will handle UI update and call initializeUserKanbanData via loadUserKanbanData
    })
    .catch(error => {
      signupMessage.textContent = `خطأ في التسجيل: ${error.message}`;
    });
});

// --- Login Functionality ---
loginButton.addEventListener("click", () => {
  const email = loginEmailInput.value;
  const password = loginPasswordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      loginMessage.textContent = "تم تسجيل الدخول بنجاح!";
      // onAuthStateChanged will handle UI update
    })
    .catch(error => {
      loginMessage.textContent = `خطأ في تسجيل الدخول: ${error.message}`;
    });
});

// --- Logout Functionality ---
logoutButton.addEventListener("click", () => {
  auth.signOut().catch(error => {
    console.error("Logout error", error);
    // Optionally display a message to the user
  });
});

// --- Kanban Board Logic (User-Specific) ---

function initializeUserKanbanData(userId) {
  const userBoardColumnsRef = database.ref(`users/${userId}/kanban/columns`);
  const initialColumns = {};
  defaultColumns.forEach(colName => {
    initialColumns[colName] = { title: colName };
  });
  return userBoardColumnsRef.set(initialColumns).then(() => {
      console.log("تم إنشاء أعمدة Kanban الأولية للمستخدم الجديد.");
      return initialColumns; // Return the created columns for immediate rendering
  }).catch(error => {
      console.error("خطأ في إنشاء أعمدة Kanban الأولية: ", error);
  });
}

function loadUserKanbanData(userId) {
  const userBoardColumnsRef = database.ref(`users/${userId}/kanban/columns`);

  userBoardColumnsRef.once("value").then(snapshot => {
    if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
      console.log("لا توجد أعمدة للمستخدم، جاري إنشاء الأعمدة الافتراضية...");
      initializeUserKanbanData(userId).then(initialColumns => {
        if (initialColumns) renderColumns(initialColumns);
      });
    } else {
      console.log("تم تحميل أعمدة المستخدم.");
      renderColumns(snapshot.val());
    }
  }).catch(error => {
    console.error("خطأ في تحميل بيانات لوحة المستخدم: ", error);
    boardDiv.innerHTML = "<p>حدث خطأ أثناء تحميل بيانات لوحة المهام. الرجاء المحاولة مرة أخرى.</p>";
  });
}

function renderColumns(columnsData) {
  if (!currentUserId) return;
  boardDiv.innerHTML = ""; // Clear previous board content

  const columnKeys = Object.keys(columnsData);

  columnKeys.forEach(colKey => {
    const column = columnsData[colKey];
    const columnDiv = document.createElement("div");
    columnDiv.className = "column";
    columnDiv.id = colKey; // Use key from DB (e.g., 'todo', 'doing')

    columnDiv.innerHTML = `
      <h2>${column.title.toUpperCase()}</h2>
      <button onclick="promptAddTask(\'${colKey}\')">+ إضافة مهمة</button>
      <div class="task-list" id="tasks-${colKey}"></div>
    `;
    boardDiv.appendChild(columnDiv);
    loadTasks(colKey);

    Sortable.create(document.getElementById(`tasks-${colKey}`), {
      group: "tasks",
      animation: 150,
      onAdd: (e) => {
        const taskId = e.item.dataset.id;
        const newColumnKey = colKey;
        // Ensure the task is not moved to the same column it originated from by SortableJS internal move
        if (e.from.id !== e.to.id) {
            moveTask(taskId, newColumnKey);
        }
      }
    });
  });
}

function promptAddTask(columnKey) {
  if (!currentUserId) return;
  const taskText = prompt("أدخل وصف المهمة:");
  if (taskText && taskText.trim() !== "") {
    addTaskToDb(columnKey, taskText.trim());
  }
}

function addTaskToDb(columnKey, taskText) {
  if (!currentUserId) return;
  const userTasksRef = database.ref(`users/${currentUserId}/kanban/tasks`);
  const newTaskRef = userTasksRef.push();
  newTaskRef.set({
    id: newTaskRef.key,
    text: taskText,
    column: columnKey
  }).then(() => {
    console.log("تمت إضافة المهمة بنجاح.");
  }).catch(error => {
    console.error("خطأ في إضافة المهمة: ", error);
  });
}

function loadTasks(columnKey) {
  if (!currentUserId) return;
  const listElement = document.getElementById(`tasks-${columnKey}`);
  if (!listElement) return;

  const userTasksInColumnRef = database.ref(`users/${currentUserId}/kanban/tasks`).orderByChild("column").equalTo(columnKey);

  // Detach previous listener for this column if it exists
  if (tasksListeners[columnKey]) {
    tasksListeners[columnKey].off();
  }

  tasksListeners[columnKey] = userTasksInColumnRef;
  userTasksInColumnRef.on("value", snapshot => {
    listElement.innerHTML = ""; // Clear current tasks in the list
    snapshot.forEach(childSnapshot => {
      const task = childSnapshot.val();
      const taskDiv = document.createElement("div");
      taskDiv.className = "task";
      taskDiv.textContent = task.text;
      taskDiv.dataset.id = task.id;

      taskDiv.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm("هل تريد حذف هذه المهمة؟")) {
          deleteTask(task.id);
        }
      };
      listElement.appendChild(taskDiv);
    });
  }, error => {
      console.error(`خطأ في تحميل مهام العمود ${columnKey}: `, error);
  });
}

function deleteTask(taskId) {
  if (!currentUserId) return;
  database.ref(`users/${currentUserId}/kanban/tasks/${taskId}`).remove()
    .then(() => console.log("تم حذف المهمة."))
    .catch(error => console.error("خطأ في حذف المهمة: ", error));
}

function moveTask(taskId, newColumnKey) {
  if (!currentUserId) return;
  database.ref(`users/${currentUserId}/kanban/tasks/${taskId}/column`).set(newColumnKey)
    .then(() => console.log(`تم نقل المهمة ${taskId} إلى العمود ${newColumnKey}`))
    .catch(error => console.error("خطأ في نقل المهمة: ", error));
}

// Add event listeners for Enter key in auth forms
loginEmailInput.addEventListener("keypress", function(event) { if (event.key === "Enter") loginPasswordInput.focus(); });
loginPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") loginButton.click(); });
signupEmailInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupPasswordInput.focus(); });
signupPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupConfirmPasswordInput.focus(); });
signupConfirmPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupButton.click(); });

console.log("تم تحميل script.js الجديد مع دعم Firebase Auth و RTDB لكل مستخدم.");

