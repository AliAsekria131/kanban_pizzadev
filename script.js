// بيانات الاتصال بـ Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAg_od40W0g477isds61y9BVrlmKo7-1LY",
  authDomain: "kanban-pizzadev.firebaseapp.com",
  projectId: "kanban-pizzadev",
  storageBucket: "kanban-pizzadev.firebasestorage.app",
  messagingSenderId: "303784063094",
  appId: "1:303784063094:web:93cd91dce5cd33d7d1af57",
  measurementId: "G-RKSYV53YG5",
  databaseURL: "https://kanban-pizzadev-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// نفس كود التهيئة السابق
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// أسماء الأعمدة
const defaultColumns = ["todo", "doing", "done"];

// تحميل الأعمدة من Firebase أو إنشاؤها
function loadColumns() {
  const boardRef = database.ref("board/columns");

  boardRef.once("value").then(snapshot => {
    if (!snapshot.exists()) {
      // إذا لم توجد أعمدة، أنشئها
      defaultColumns.forEach(col => {
        boardRef.child(col).set({ title: col });
      });
      console.log("✅ تم إنشاء الأعمدة الأولية");
    } else {
      console.log("✅ تم تحميل الأعمدة");
    }

    // الآن، عرض الأعمدة
    renderColumns(snapshot.val() || {});
  });
}

function renderColumns(columnsData) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  const columns = Object.keys(columnsData).length
    ? Object.keys(columnsData)
    : defaultColumns;

  columns.forEach(col => {
    const columnDiv = document.createElement("div");
    columnDiv.className = "column";
    columnDiv.id = col;

    // رأس العمود + زر الإضافة
    columnDiv.innerHTML = `
      <h2>${col.toUpperCase()}</h2>
      <button onclick="addTask('${col}')">+ إضافة مهمة</button>
      <div class="task-list" id="tasks-${col}"></div>
    `;

    board.appendChild(columnDiv);

    // تحميل المهام من Firebase
    loadTasks(col);

    // تفعيل السحب
    Sortable.create(document.getElementById(`tasks-${col}`), {
      group: "tasks",
      animation: 150,
      onAdd: (e) => {
        const taskId = e.item.dataset.id;
        const newColumn = col;
        moveTask(taskId, newColumn);
      }
    });
  });
}

function addTask(column) {
  const taskText = prompt("أدخل وصف المهمة:");
  if (!taskText) return;

  const taskRef = database.ref("board/tasks").push();
  const task = {
    id: taskRef.key,
    text: taskText,
    column: column
  };

  taskRef.set(task);
}


function loadTasks(column) {
  const list = document.getElementById(`tasks-${column}`);
  list.innerHTML = "";

  database.ref("board/tasks").orderByChild("column").equalTo(column).on("value", snapshot => {
    list.innerHTML = "";
    snapshot.forEach(child => {
      const task = child.val();
      const taskDiv = document.createElement("div");
      taskDiv.className = "task";
      taskDiv.textContent = task.text;
      taskDiv.dataset.id = task.id;

taskDiv.oncontextmenu = (e) => {
  e.preventDefault(); // يمنع القائمة الافتراضية
  const confirmDelete = confirm("هل تريد حذف هذه المهمة؟");
  if (confirmDelete) {
    database.ref(`board/tasks/${task.id}`).remove();
  }
};


      list.appendChild(taskDiv);
    });
  });
}



function moveTask(taskId, newColumn) {
  database.ref(`board/tasks/${taskId}`).update({ column: newColumn });
}



// تحميل الأعمدة عند فتح الصفحة
loadColumns();
