// // Firebase SDK Configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAg_od40W0g477isds61y9BVrlmKo7-1LY",
//   authDomain: "kanban-pizzadev.firebaseapp.com",
//   projectId: "kanban-pizzadev",
//   storageBucket: "kanban-pizzadev.firebasestorage.app",
//   messagingSenderId: "303784063094",
//   appId: "1:303784063094:web:93cd91dce5cd33d7d1af57",
//   measurementId: "G-RKSYV53YG5",
//   databaseURL: "https://kanban-pizzadev-default-rtdb.asia-southeast1.firebasedatabase.app/"
// };


// Firebase SDK Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAg_od40W0g477isds61y9BVrlmKo7-1LY", // استبدل هذا بمفتاح API الخاص بك الفعلي
  authDomain: "kanban-pizzadev.firebaseapp.com",
  projectId: "kanban-pizzadev",
  storageBucket: "kanban-pizzadev.appspot.com", // تأكد من أن هذا هو الصحيح لمشروعك
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
const generalErrorMessage = document.getElementById("general-error-message");


const defaultColumns = ["todo", "doing", "done"];
const columnTitles = { // لإظهار أسماء أعمدة أفضل
    "todo": "المهام المطلوبة",
    "doing": "قيد التنفيذ",
    "done": "مكتملة"
};
let currentUserId = null;
let tasksListeners = {}; // To keep track of listeners and detach them on logout

// --- Helper function to display errors ---
function displayAuthError(element, error) {
    console.error("Authentication Error:", error);
    let message = "حدث خطأ ما. الرجاء المحاولة مرة أخرى.";
    switch (error.code) {
        case "auth/invalid-email":
            message = "البريد الإلكتروني غير صالح.";
            break;
        case "auth/user-disabled":
            message = "تم تعطيل هذا الحساب.";
            break;
        case "auth/user-not-found":
            message = "لا يوجد حساب بهذا البريد الإلكتروني.";
            break;
        case "auth/wrong-password":
            message = "كلمة المرور غير صحيحة.";
            break;
        case "auth/email-already-in-use":
            message = "هذا البريد الإلكتروني مستخدم بالفعل.";
            break;
        case "auth/weak-password":
            message = "كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل).";
            break;
        case "auth/operation-not-allowed":
            message = "تسجيل الدخول بالبريد وكلمة المرور غير مفعل.";
            break;
        default:
            message = error.message; // رسالة الخطأ الأصلية من Firebase
    }
    element.textContent = message;
}

function displayGeneralError(message) {
    generalErrorMessage.textContent = message;
    console.error("General Error:", message);
}

// --- Authentication State Observer ---
auth.onAuthStateChanged(user => { // تم إصلاح onauth إلى auth
  if (user) {
    currentUserId = user.uid;
    authSection.style.display = "none";
    kanbanApp.style.display = "block"; // إظهار لوحة كانبان
    // logoutButton.style.display = "block"; // يتم التحكم به عبر CSS في #app-header
    welcomeMessage.textContent = `مرحباً، ${user.email || 'المستخدم'}`;
    // welcomeMessage.style.display = "block"; // يتم التحكم به عبر CSS في #app-header
    loginMessage.textContent = "";
    signupMessage.textContent = "";
    generalErrorMessage.textContent = "";
    loadUserKanbanData(currentUserId);
  } else {
    currentUserId = null;
    authSection.style.display = "flex"; // استخدام flex لتوسيط المحتوى
    loginContainer.style.display = "block";
    signupContainer.style.display = "none";
    kanbanApp.style.display = "none";
    // logoutButton.style.display = "none";
    // welcomeMessage.style.display = "none";
    boardDiv.innerHTML = "";
    loginMessage.textContent = ""; // مسح رسائل الخطأ عند تسجيل الخروج
    signupMessage.textContent = "";
    generalErrorMessage.textContent = "";

    Object.keys(tasksListeners).forEach(column => {
      if (tasksListeners[column]) {
        tasksListeners[column].off();
      }
    });
    tasksListeners = {};
  }
});

// --- UI Toggling ---
showSignupButton.addEventListener("click", () => {
  loginContainer.style.display = "none";
  signupContainer.style.display = "block";
  loginMessage.textContent = "";
  signupMessage.textContent = "";
});

showLoginButton.addEventListener("click", () => {
  signupContainer.style.display = "none";
  loginContainer.style.display = "block";
  loginMessage.textContent = "";
  signupMessage.textContent = "";
});

// --- Signup ---
signupButton.addEventListener("click", () => {
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmPasswordInput.value;

  signupMessage.textContent = ""; // Clear previous messages

  if (!email || !password || !confirmPassword) {
    signupMessage.textContent = "يرجى ملء جميع الحقول.";
    return;
  }
  if (password !== confirmPassword) {
    signupMessage.textContent = "كلمتا المرور غير متطابقتين.";
    return;
  }
  if (password.length < 6) {
    signupMessage.textContent = "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.";
    return;
  }

  signupButton.disabled = true;
  signupButton.textContent = "جاري التسجيل...";

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      signupMessage.textContent = "تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...";
      // onAuthStateChanged will handle UI update
      // No need to explicitly call initializeUserKanbanData, loadUserKanbanData will handle it if new user
    })
    .catch(error => {
      displayAuthError(signupMessage, error);
    })
    .finally(() => {
      signupButton.disabled = false;
      signupButton.textContent = "تسجيل";
    });
});

// --- Login ---
loginButton.addEventListener("click", () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  loginMessage.textContent = "";

  if (!email || !password) {
    loginMessage.textContent = "يرجى إدخال البريد الإلكتروني وكلمة المرور.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "جاري الدخول...";

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      loginMessage.textContent = ""; // تم تسجيل الدخول بنجاح! (سيقوم onAuthStateChanged بالتحديث)
    })
    .catch(error => {
      displayAuthError(loginMessage, error);
    })
    .finally(() => {
      loginButton.disabled = false;
      loginButton.textContent = "دخول";
    });
});

// --- Logout ---
logoutButton.addEventListener("click", () => {
  logoutButton.disabled = true;
  auth.signOut().catch(error => {
    console.error("Logout error", error);
    displayGeneralError("حدث خطأ أثناء تسجيل الخروج.");
  }).finally(() => {
    logoutButton.disabled = false;
  });
});

// --- Kanban Board Logic (User-Specific) ---

function initializeUserKanbanData(userId) {
  const userBoardColumnsRef = database.ref(`users/${userId}/kanban/columns`);
  const initialColumnsData = {};
  defaultColumns.forEach(colName => {
    initialColumnsData[colName] = { title: columnTitles[colName] || colName }; // استخدام العناوين المخصصة
  });
  return userBoardColumnsRef.set(initialColumnsData).then(() => {
      console.log("تم إنشاء أعمدة Kanban الأولية للمستخدم الجديد.");
      return initialColumnsData;
  }).catch(error => {
      console.error("خطأ في إنشاء أعمدة Kanban الأولية: ", error);
      displayGeneralError("خطأ في تهيئة لوحة المهام.");
  });
}

function loadUserKanbanData(userId) {
  const userBoardColumnsRef = database.ref(`users/${userId}/kanban/columns`);
  generalErrorMessage.textContent = ""; // Clear previous general errors

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
    displayGeneralError("حدث خطأ أثناء تحميل بيانات لوحة المهام. الرجاء المحاولة مرة أخرى.");
  });
}

function renderColumns(columnsData) {
  if (!currentUserId) return;
  boardDiv.innerHTML = "";

  const columnKeys = defaultColumns; // للحفاظ على ترتيب محدد للأعمدة

  columnKeys.forEach(colKey => {
    const column = columnsData[colKey];
    if (!column) {
        console.warn(`بيانات العمود ${colKey} غير موجودة, قد يتم إنشاؤها لاحقًا أو تحتاج إلى تهيئة.`);
        return; // تجاوز الأعمدة غير الموجودة في البيانات
    }

    const columnDiv = document.createElement("div");
    columnDiv.className = "column";
    columnDiv.id = colKey;

    columnDiv.innerHTML = `
      <h2>${(column.title || colKey).toUpperCase()}</h2>
      <button class="add-task-btn" onclick="promptAddTask(\'${colKey}\')">+ إضافة مهمة</button>
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
        if (e.from.id !== e.to.id) { // تأكد من أن الانتقال تم لعمود مختلف
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
    column: columnKey,
    createdAt: firebase.database.ServerValue.TIMESTAMP // إضافة وقت الإنشاء
  }).then(() => {
    console.log("تمت إضافة المهمة بنجاح.");
  }).catch(error => {
    console.error("خطأ في إضافة المهمة: ", error);
    displayGeneralError("خطأ في إضافة المهمة.");
  });
}

function promptEditTask(taskId, currentText) {
    if (!currentUserId) return;
    const newText = prompt("قم بتعديل المهمة:", currentText);
    if (newText && newText.trim() !== "" && newText.trim() !== currentText) {
        updateTaskTextInDb(taskId, newText.trim());
    }
}

function updateTaskTextInDb(taskId, newText) {
    if (!currentUserId) return;
    database.ref(`users/${currentUserId}/kanban/tasks/${taskId}/text`).set(newText)
    .then(() => {
        console.log("تم تحديث المهمة بنجاح.");
    })
    .catch(error => {
        console.error("خطأ في تحديث المهمة: ", error);
        displayGeneralError("خطأ في تحديث المهمة.");
    });
}


function loadTasks(columnKey) {
  if (!currentUserId) return;
  const listElement = document.getElementById(`tasks-${columnKey}`);
  if (!listElement) return;

  const userTasksInColumnRef = database.ref(`users/${currentUserId}/kanban/tasks`).orderByChild("column").equalTo(columnKey);

  if (tasksListeners[columnKey]) {
    tasksListeners[columnKey].off();
  }

  tasksListeners[columnKey] = userTasksInColumnRef;
  userTasksInColumnRef.on("value", snapshot => {
    listElement.innerHTML = "";
    snapshot.forEach(childSnapshot => {
      const task = childSnapshot.val();
      if (!task || !task.id) return; // تحقق من وجود المهمة ومعرفها

      const taskDiv = document.createElement("div");
      taskDiv.className = "task";
      taskDiv.dataset.id = task.id;

      const taskTextSpan = document.createElement("span");
      taskTextSpan.className = "task-text";
      taskTextSpan.textContent = task.text;
      taskTextSpan.onclick = () => promptEditTask(task.id, task.text); // تعديل عند النقر

      const taskActionsDiv = document.createElement("div");
      taskActionsDiv.className = "task-actions";

      const deleteButton = document.createElement("button");
      deleteButton.innerHTML = "&#128465;"; // أيقونة سلة مهملات
      deleteButton.title = "حذف المهمة";
      deleteButton.onclick = (e) => {
          e.stopPropagation(); // منع déclenchement تعديل المهمة
          if (confirm("هل تريد حذف هذه المهمة؟")) {
            deleteTask(task.id);
          }
      };

      taskActionsDiv.appendChild(deleteButton);
      taskDiv.appendChild(taskTextSpan);
      taskDiv.appendChild(taskActionsDiv);

      // بدلاً من oncontextmenu، نستخدم زر الحذف الواضح
      // taskDiv.oncontextmenu = (e) => { /* ... */ }; // يمكن إزالتها أو تغييرها

      listElement.appendChild(taskDiv);
    });
  }, error => {
      console.error(`خطأ في تحميل مهام العمود ${columnKey}: `, error);
      displayGeneralError(`خطأ في تحميل مهام العمود ${columnTitles[columnKey] || columnKey}.`);
  });
}

function deleteTask(taskId) {
  if (!currentUserId) return;
  database.ref(`users/${currentUserId}/kanban/tasks/${taskId}`).remove()
    .then(() => console.log("تم حذف المهمة."))
    .catch(error => {
        console.error("خطأ في حذف المهمة: ", error);
        displayGeneralError("خطأ في حذف المهمة.");
    });
}

function moveTask(taskId, newColumnKey) {
  if (!currentUserId) return;
  database.ref(`users/${currentUserId}/kanban/tasks/${taskId}/column`).set(newColumnKey)
    .then(() => console.log(`تم نقل المهمة ${taskId} إلى العمود ${newColumnKey}`))
    .catch(error => {
        console.error("خطأ في نقل المهمة: ", error);
        displayGeneralError("خطأ في نقل المهمة.");
    });
}

// Event listeners for Enter key
loginEmailInput.addEventListener("keypress", function(event) { if (event.key === "Enter") loginPasswordInput.focus(); });
loginPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") loginButton.click(); });
signupEmailInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupPasswordInput.focus(); });
signupPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupConfirmPasswordInput.focus(); });
signupConfirmPasswordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") signupButton.click(); });

console.log("تم تحميل script.js المحدث مع تحسينات Firebase Auth و RTDB.");