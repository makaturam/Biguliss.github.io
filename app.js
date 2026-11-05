(() => {
  const KEY = {
    users: "bss_users_v1",
    learners: "bss_learners_v1",
    assessments: "bss_assessments_v1",
    activities: "bss_activities_v1",
    attendance: "bss_attendance_v1",
    fees: "bss_fees_v1",
    expenses: "bss_expenses_v1",
    inventory: "bss_inventory_v1",
    timetable: "bss_timetable_v1",
    discipline: "bss_discipline_v1",
    announcements: "bss_announcements_v1",
    session: "bss_session_v1"
  };

  const oLevelSubjects = [
    "English Language","Mathematics","Physics","Chemistry","Biology",
    "Geography","History","ICT","Agriculture","Entrepreneurship",
    "ENT","Runyankore/Rukiga","Art and Design"
  ];
  const aLevelSubjects = [
    "English Language","Mathematics","Physics","Chemistry","Biology",
    "Geography","History","ICT","Agriculture","Entrepreneurship",
    "GP","Submath","Sub-ICT","Literature","Divinity"
  ];
  const subjects = [...new Set([...oLevelSubjects,...aLevelSubjects])];
  const subjectsForClass = className => /^S[1-4]$/.test(className||"") ? oLevelSubjects : aLevelSubjects;
  const classes = ["S1","S2","S3","S4","S5","S6"];
  const streams = ["A","B","C","D"];
  const terms = ["Term 1","Term 2","Term 3"];

  const id = () => "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const get = k => JSON.parse(localStorage.getItem(k) || "[]");
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const session = () => JSON.parse(localStorage.getItem(KEY.session) || "null");
  const escape = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const currentUser = () => {
    const s=session();
    if(!s) return null;
    if(s.type==="student"){
      const l=get(KEY.learners).find(x=>x.id===s.learnerId);
      return l ? {...l, role:"student", active:true, subjects:[]} : null;
    }
    return get(KEY.users).find(u=>u.id===s.userId) || null;
  };
  const grade = mark => {
    const n = Number(mark);
    if (!Number.isFinite(n) || n === "") return "";
    return n >= 80 ? "A" : n >= 70 ? "B" : n >= 60 ? "C" : n >= 50 ? "D" : "E";
  };
  const notify = msg => {
    const el=document.getElementById("toast");
    if(!el)return;
    el.textContent=msg; el.classList.add("show");
    setTimeout(()=>el.classList.remove("show"),2400);
  };
  const setServerStatus = (state, message) => {
    const el=document.getElementById("serverStatus");
    if(!el)return;
    el.dataset.state=state;
    el.textContent=message;
  };

  function nextAdmissionNumber(){
    const rows = get(KEY.learners);
    let max = 0;
    rows.forEach(l => {
      const m = String(l.admission || "").match(/BSS(\d+)/i);
      if(m) max = Math.max(max, Number(m[1]));
    });
    let n = max + 1;
    let value = `BSS${String(n).padStart(4,"0")}`;
    while(rows.some(l => String(l.admission).toUpperCase() === value)) {
      n++; value = `BSS${String(n).padStart(4,"0")}`;
    }
    return value;
  }

  function seed(){
    if(!localStorage.getItem(KEY.users)) {
      save(KEY.users, [
        {id:id(),name:"System Administrator",email:"admin@biguli.local",password:"ChangeMe123!",role:"admin",subjects:[],active:true},
        {id:id(),name:"Demo Teacher",email:"teacher@biguli.local",password:"Teacher123!",role:"teacher",subjects:["Mathematics","Physics"],active:true}
      ]);
    }
    if(!localStorage.getItem(KEY.learners)) save(KEY.learners, [
      {id:id(),admission:"BSS0001",name:"Amina Namusoke",gender:"Female",dob:"2010-05-14",className:"S4",stream:"A",guardian:"John Namusoke",phone:"0700000000"},
      {id:id(),admission:"BSS0002",name:"Daniel Mugisha",gender:"Male",dob:"2011-02-03",className:"S3",stream:"B",guardian:"Sarah Mugisha",phone:"0711111111"}
    ]);
    if(!localStorage.getItem(KEY.assessments)) save(KEY.assessments, []);
    if(!localStorage.getItem(KEY.activities)) save(KEY.activities, []);
    ["attendance","fees","expenses","inventory","timetable","discipline","announcements"].forEach(k=>{ if(!localStorage.getItem(KEY[k])) save(KEY[k],[]); });
  }

  function initLoginPage(){
    seed();
    const form=document.getElementById("loginForm");
    if(session()){ location.href="portal.html"; return; }

    const typeSelect=document.getElementById("loginType");
    const staffFields=document.getElementById("staffLoginFields");
    const studentFields=document.getElementById("studentLoginFields");
    const syncLoginMode=()=>{
      const student=typeSelect?.value==="student";
      if(staffFields) staffFields.classList.toggle("hidden",student);
      if(studentFields) studentFields.classList.toggle("hidden",!student);
      ["loginEmail","loginPassword"].forEach(id=>{
        const el=document.getElementById(id); if(el) el.required=!student;
      });
      ["studentId","studentName"].forEach(id=>{
        const el=document.getElementById(id); if(el) el.required=student;
      });
      const title=document.getElementById("loginTitle");
      const subtitle=document.getElementById("loginSubtitle");
      if(title) title.textContent=student ? "Student access" : "Staff access";
      if(subtitle) subtitle.textContent=student
        ? "Enter your school ID, name and class to view your report and make a payment."
        : "Teachers can enter marks only. Administrators can manage the whole system.";
    };
    if(typeSelect) { typeSelect.addEventListener("change",syncLoginMode); syncLoginMode(); }

    form.addEventListener("submit",e=>{
      e.preventDefault();
      const msg=document.getElementById("loginMessage");
      const mode=typeSelect?.value || "staff";

      if(mode==="student"){
        const admission=document.getElementById("studentId").value.trim().toUpperCase();
        const name=document.getElementById("studentName").value.trim().toLowerCase();
        const className=document.getElementById("studentClass").value;
        const learner=get(KEY.learners).find(l =>
          String(l.admission||"").toUpperCase()===admission &&
          String(l.name||"").trim().toLowerCase()===name &&
          l.className===className
        );
        if(!learner){
          msg.className="message error";
          msg.textContent="Student details do not match our school records.";
          return;
        }
        save(KEY.session,{type:"student",learnerId:learner.id,loginAt:new Date().toISOString()});
        location.href="portal.html";
        return;
      }

      const email=document.getElementById("loginEmail").value.trim().toLowerCase();
      const password=document.getElementById("loginPassword").value;
      const u=get(KEY.users).find(x=>x.email.toLowerCase()===email && x.password===password && x.active);
      if(!u){msg.className="message error";msg.textContent="Invalid staff login details or inactive account.";return;}
      save(KEY.session,{type:"staff",userId:u.id,loginAt:new Date().toISOString()});
      location.href="portal.html";
    });
  }

  function initPortal(){
    seed();
    if(!session() || !currentUser()){location.href="login.html";return;}
    const u=currentUser();
    document.getElementById("sideName").textContent=u.name;
    document.getElementById("sideRole").textContent=u.role.toUpperCase();
    document.getElementById("sideAvatar").innerHTML=`<img src="PGN.PNG" alt="Biguli Secondary School badge">`;
    document.getElementById("topName").textContent=u.name;
    document.getElementById("topRole").textContent=u.role.toUpperCase();
    buildNav(u);
    const initialRoute=u.role==="admin" ? "dashboard" : u.role==="teacher" ? "assessments" : "student-fees";
    setServerStatus("checking","Checking marks server…");
    route(initialRoute);
    checkServerConnection();
  }

  async function checkServerConnection(){
    try{
      const response=await fetch("/api/health",{cache:"no-store"});
      if(!response.ok) throw new Error("Server health check failed.");
      const result=await response.json();
      if(result.ok!==true) throw new Error("Server health check returned an invalid response.");
      setServerStatus("connected","Marks server connected");
    }catch(error){
      setServerStatus("offline","Marks server offline — start data.py");
    }
  }

  function buildNav(u){
    const nav=document.getElementById("mainNav");
    let items=[];
    if(u.role==="admin"){
      items=[
        ["dashboard","▦","Dashboard"],
        ["analytics","▥","Term Analytics"],
        ["learners","♙","Students / Classes"],
        ["attendance","✓","Attendance"],
        ["assessments","▤","Academic / Marks"],
        ["reports","▥","Results & Reports"],
        ["fees","▣","Fees / Finance"],
        ["teachers","♟","Staff Management"],
        ["inventory","▤","Assets / Inventory"],
        ["timetable","◫","Timetable"],
        ["discipline","⚠","Discipline / Welfare"],
        ["activities","⚙","Activities / AOI"]
      ];
    } else if(u.role==="teacher"){
      items=[
        ["assessments","▤","Enter Student Marks"],
        ["activities","⚙","Enter AOI Marks"]
      ];
    } else if(u.role==="student"){
      items=[
        ["student-fees","▣","My Payments"],
        ["student-report","▥","My Report"]
      ];
    }
    nav.innerHTML=items.map(x=>`<button class="nav-item" data-route="${x[0]}" onclick="Biguli.route('${x[0]}')">${x[1]} <span>${x[2]}</span></button>`).join("");
  }

  function route(name){
    const u=currentUser(); if(!u)return;
    const permissions={
      admin:["dashboard","analytics","learners","attendance","assessments","activities","reports","fees","teachers","inventory","timetable","discipline"],
      teacher:["assessments","activities"],
      student:["student-fees","student-report"]
    };
    if(!(permissions[u.role]||[]).includes(name)){
      name=u.role==="admin"?"dashboard":u.role==="teacher"?"assessments":"student-fees";
    }
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===name));
    const titles={
      dashboard:["Dashboard","Administrator overview — full school access"],
      analytics:["Term Analytics","Academic performance and fee collection trends by term"],
      learners:["Students / Classes","Administrator-only learner registration and class records"],
      teachers:["Staff Management","Administrator-only teacher accounts and subject permissions"],
      attendance:["Attendance","Administrator-only daily class attendance"],
      assessments:[u.role==="teacher"?"Enter Student Marks":"Academic / Marks","Whole-class mark sheets — teachers only for entering marks"],
      activities:["Activities / AOI","Teachers record Activity of Integration marks out of 20"],
      reports:["Results & Reports","Administrator report generation for any learner"],
      fees:["Fees / Finance","Administrator view of all school payments and finance records"],
      inventory:["Assets / Inventory","Administrator-only school assets and inventory control"],
      timetable:["Timetable","Administrator-only timetable management"],
      discipline:["Discipline / Welfare","Administrator-only learner welfare records"],
      "student-fees":["My Payments","View your payments and record a payment using your school account"],
      "student-report":["My Report","View only your own academic report"]
    };
    document.getElementById("pageTitle").textContent=titles[name][0];
    document.getElementById("pageSubtitle").textContent=titles[name][1];
    const content=document.getElementById("content");
    const views={
      dashboard:()=>dashboardView(u), analytics:()=>analyticsView(), learners:()=>learnersView(u), teachers:()=>teachersView(u),
      attendance:()=>attendanceView(u), assessments:()=>assessmentsView(u), activities:()=>activitiesView(u),
      reports:()=>reportsView(u), fees:()=>feesView(u), inventory:()=>inventoryView(u),
      timetable:()=>timetableView(u), discipline:()=>disciplineView(u),
      "student-fees":()=>studentFeesView(u), "student-report":()=>studentReportView(u)
    };
    content.innerHTML=views[name]();
    if(name==="dashboard") renderRecent();
    if(name==="learners") filterLearners("S1");
    if(name==="assessments"){
      renderClassRecordSheet();
      syncAssessmentRecords().then(()=>{
        if(document.getElementById("classRecordSheet")) renderClassRecordSheet();
      }).catch(()=>{
        setServerStatus("offline","Marks server offline — start data.py");
        notify("Could not load marks. Start data.py and open the portal at http://127.0.0.1:8000.");
      });
    }
    if(name==="attendance") renderAttendanceSheet();
    if(name==="student-report") generateStudentReport(u);
  }

  function dashboardView(u){
    const learners=get(KEY.learners), users=get(KEY.users), assessments=get(KEY.assessments), fees=get(KEY.fees), inv=get(KEY.inventory), attendance=get(KEY.attendance);
    const teachers=users.filter(x=>x.role==="teacher");
    const paid=fees.reduce((a,x)=>a+Number(x.amount||0),0);
    return `<div class="page-head"><div><h2>Good ${new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"}, ${escape(u.name.split(" ")[0])}.</h2><p>Biguli Secondary School — integrated school management dashboard.</p></div><img class="dashboard-logo" src="PGN.PNG" alt="School badge"></div>
      <div class="stats"><div class="stat-card"><small>Students</small><strong>${learners.length}</strong></div><div class="stat-card"><small>Teachers</small><strong>${teachers.length}</strong></div><div class="stat-card"><small>Mark Records</small><strong>${assessments.length}</strong></div><div class="stat-card"><small>Fees Collected</small><strong>${paid.toLocaleString()}</strong></div></div>
      <div class="class-overview">${classes.map(c=>`<button class="class-card" onclick="Biguli.route('learners');setTimeout(()=>Biguli.filterLearners('${c}'),0)"><span>${c}</span><b>${learners.filter(l=>l.className===c).length}</b><small>students</small></button>`).join("")}</div>
      <div class="grid-2"><div class="panel"><h3>School Monitor-style modules</h3><div class="module-grid"><button onclick="Biguli.route('learners')">Students</button><button onclick="Biguli.route('attendance')">Attendance</button><button onclick="Biguli.route('assessments')">Results</button><button onclick="Biguli.route('fees')">Fees</button><button onclick="Biguli.route('teachers')">Staff</button><button onclick="Biguli.route('inventory')">Inventory</button><button onclick="Biguli.route('timetable')">Timetable</button><button onclick="Biguli.route('discipline')">Welfare</button></div></div><div class="panel"><h3>Teacher access</h3><p class="muted">Teachers work from class sheets and can only enter their assigned subjects.</p><div class="subject-list">${(u.subjects||[]).map(s=>`<span class="tag">${escape(s)}</span>`).join("")||'<span class="muted">Administrator account — all subjects</span>'}</div></div></div>
      <div class="panel"><h3>System snapshot</h3><div class="grid-3"><div><b>${attendance.length}</b><br><span class="muted">Attendance entries</span></div><div><b>${inv.length}</b><br><span class="muted">Inventory items</span></div><div><b>${fees.length}</b><br><span class="muted">Fee transactions</span></div></div></div>
      <div class="panel"><h3>Recent students</h3><div id="recentLearners"></div></div>`;
  }

  function renderRecent(){
    const el=document.getElementById("recentLearners"), rows=get(KEY.learners).slice(-6).reverse();
    el.innerHTML=rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Student ID</th><th>Name</th><th>Class</th><th>Stream</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${escape(l.admission)}</td><td>${escape(l.name)}</td><td>${escape(l.className)}</td><td>${escape(l.stream)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No learners registered yet.</div>';
  }

  function classTabs(active, fn){
    return `<div class="class-tabs">${classes.map(c=>`<button class="class-tab ${c===active?"active":""}" onclick="${fn}('${c}')">${c}<small>${get(KEY.learners).filter(l=>l.className===c).length}</small></button>`).join("")}</div>`;
  }

  function learnersView(){
    return `<div class="page-head"><div><h2>Separate Class Sheets</h2><p>Each class has its own learner register. Student IDs are generated automatically as BSS0001, BSS0002, BSS0003…</p></div><button class="btn btn-primary" onclick="Biguli.openLearnerForm()">+ Register Learner</button></div>
      <div class="panel">${classTabs("S1","Biguli.filterLearners")}<div class="toolbar"><input id="learnerSearch" placeholder="Search this class by student ID or name..." oninput="Biguli.filterLearners(document.getElementById('currentClass')?.value||'S1')" style="max-width:360px"><input type="hidden" id="currentClass" value="S1"><button class="btn btn-light" onclick="Biguli.exportLearners()">Export CSV</button></div><div id="learnerTable"></div></div>`;
  }

  function filterLearners(className){
    const cls=className || document.getElementById("currentClass")?.value || "S1";
    const hidden=document.getElementById("currentClass"); if(hidden) hidden.value=cls;
    const q=(document.getElementById("learnerSearch")?.value||"").toLowerCase();
    const rows=get(KEY.learners).filter(l=>l.className===cls && [l.admission,l.name,l.stream].join(" ").toLowerCase().includes(q));
    document.querySelectorAll(".class-tab").forEach(b=>b.classList.toggle("active",b.textContent.trim().startsWith(cls)));
    const el=document.getElementById("learnerTable"); if(!el)return;
    el.innerHTML=rows.length?`<div class="sheet-title"><strong>${cls} LEARNER REGISTER</strong><span>${rows.length} learner(s)</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Student ID</th><th>Full Name</th><th>Gender</th><th>Stream</th><th>Date of Birth</th><th>Guardian</th><th></th></tr></thead><tbody>${rows.map(l=>`<tr><td><b>${escape(l.admission)}</b></td><td>${escape(l.name)}</td><td>${escape(l.gender)}</td><td>${escape(l.stream)}</td><td>${escape(l.dob)}</td><td>${escape(l.guardian)}</td><td><button class="btn btn-light btn-sm" onclick="Biguli.openLearnerForm('${l.id}')">Edit</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No learners are registered in ${cls} yet.</div>`;
  }

  function openLearnerForm(editId){
    const l=get(KEY.learners).find(x=>x.id===editId)||{};
    const isEdit=Boolean(editId);
    openModal(`<h2>${isEdit?"Edit":"Register"} Learner</h2><p class="muted">${isEdit?"Update the learner record.":"The Student ID is generated automatically and cannot be duplicated."}</p><form onsubmit="Biguli.saveLearner(event,'${editId||""}')">
      <div class="form-grid">
        <label>Student ID<input name="admission" readonly value="${escape(isEdit?l.admission:nextAdmissionNumber())}"></label>
        <label>Full Name<input name="name" required value="${escape(l.name)}"></label>
        <label>Gender<select name="gender"><option ${l.gender==="Male"?"selected":""}>Male</option><option ${l.gender==="Female"?"selected":""}>Female</option></select></label>
        <label>Date of Birth<input name="dob" type="date" value="${escape(l.dob)}"></label>
        <label>Class<select name="className">${classes.map(c=>`<option ${l.className===c?"selected":""}>${c}</option>`).join("")}</select></label>
        <label>Stream<select name="stream">${streams.map(s=>`<option ${l.stream===s?"selected":""}>${s}</option>`).join("")}</select></label>
        <label>Parent / Guardian<input name="guardian" value="${escape(l.guardian)}"></label>
        <label>Guardian Phone<input name="phone" value="${escape(l.phone)}"></label>
      </div><button class="btn btn-primary btn-full" type="submit">Save Learner</button></form>`);
  }

  function saveLearner(e,editId){
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    let rows=get(KEY.learners);
    if(editId) {
      const old=rows.find(x=>x.id===editId);
      rows=rows.map(x=>x.id===editId?{...x,...data,admission:old.admission}:x);
    } else {
      data.admission=nextAdmissionNumber();
      if(rows.some(x=>x.admission===data.admission)){ notify("Student ID collision prevented. Please try again."); return; }
      rows.push({id:id(),...data});
    }
    save(KEY.learners,rows); closeModal(); route("learners"); notify("Learner record saved.");
  }

  function teachersView(){
    const rows=get(KEY.users).filter(x=>x.role==="teacher");
    return `<div class="page-head"><div><h2>Teacher Management</h2><p>Create authorised staff accounts and assign subjects.</p></div><button class="btn btn-primary" onclick="Biguli.openTeacherForm()">+ Add Teacher</button></div>
    <div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Subjects</th><th>Status</th><th></th></tr></thead><tbody>${rows.length?rows.map(t=>`<tr><td>${escape(t.name)}</td><td>${escape(t.email)}</td><td><div class="subject-list">${(t.subjects||[]).map(s=>`<span class="tag">${escape(s)}</span>`).join("")}</div></td><td>${t.active?'<span class="tag">Active</span>':'<span class="tag tag-danger">Inactive</span>'}</td><td><button class="btn btn-light" onclick="Biguli.openTeacherForm('${t.id}')">Edit</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">No teachers found.</td></tr>'}</tbody></table></div></div>`;
  }

  function openTeacherForm(editId){
    const t=get(KEY.users).find(x=>x.id===editId)||{subjects:[],active:true};
    openModal(`<h2>${editId?"Edit":"Add"} Teacher</h2><form onsubmit="Biguli.saveTeacher(event,'${editId||""}')">
      <div class="form-grid"><label>Name<input name="name" required value="${escape(t.name)}"></label><label>Email<input name="email" type="email" required value="${escape(t.email)}"></label><label>Password<input name="password" ${editId?"placeholder='Leave blank to keep current'":"required"} type="password"></label><label>Status<select name="active"><option value="true" ${t.active!==false?"selected":""}>Active</option><option value="false" ${t.active===false?"selected":""}>Inactive</option></select></label>
      <div class="full"><label>Subjects taught</label><div class="check-grid">${subjects.map(s=>`<label><input type="checkbox" name="subjects" value="${escape(s)}" ${(t.subjects||[]).includes(s)?"checked":""}>${escape(s)}</label>`).join("")}</div></div></div>
      <button class="btn btn-primary btn-full" type="submit">Save Teacher</button></form>`);
  }

  function saveTeacher(e,editId){
    e.preventDefault();
    const fd=new FormData(e.target), rows=get(KEY.users), selected=fd.getAll("subjects");
    const email=fd.get("email").toLowerCase();
    if(rows.some(x=>x.email===email && x.id!==editId)){notify("That email is already in use.");return;}
    const data={name:fd.get("name"),email,subjects:selected,active:fd.get("active")==="true"};
    if(fd.get("password"))data.password=fd.get("password");
    if(editId) save(KEY.users,rows.map(x=>x.id===editId?{...x,...data}:x));
    else {data.id=id();data.role="teacher";data.password=data.password||"Teacher123!";save(KEY.users,[...rows,data]);}
    closeModal();route("teachers");notify("Teacher account saved.");
  }

  function analyticsView(){
    const assessments=get(KEY.assessments), learners=get(KEY.learners), fees=get(KEY.fees);
    const academic=terms.map(term=>{const rows=assessments.filter(a=>a.term===term&&Number.isFinite(Number(a.mark)));return {term,count:rows.length,avg:rows.length?Math.round(rows.reduce((sum,a)=>sum+Number(a.mark),0)/rows.length):0};});
    const payment=terms.map(term=>{const rows=fees.filter(f=>(f.term||"Term 1")===term);return {term,count:rows.length,total:rows.reduce((sum,f)=>sum+Number(f.amount||0),0)};});
    const maxAcademic=Math.max(100,...academic.map(x=>x.avg)); const maxFees=Math.max(1,...payment.map(x=>x.total));
    const totalFees=payment.reduce((sum,x)=>sum+x.total,0);
    const bars=(items,max,valueKey,format)=>items.map(x=>`<div style="display:grid;grid-template-columns:75px 1fr 95px;gap:10px;align-items:center;margin:14px 0"><b>${escape(x.term)}</b><div style="height:18px;background:#edf2f7;border-radius:8px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,x[valueKey]/max*100))}%;background:var(--blue);border-radius:8px"></div></div><strong style="text-align:right">${format(x[valueKey])}</strong></div>`).join("");
    return `<div class="page-head"><div><h2>Term Analytics</h2><p>Academic performance and fee collection, based on records saved in this browser.</p></div></div>
      <div class="stats"><div class="stat-card"><small>Students</small><strong>${learners.length}</strong></div><div class="stat-card"><small>Assessment records</small><strong>${assessments.length}</strong></div><div class="stat-card"><small>Payments recorded</small><strong>${fees.length}</strong></div><div class="stat-card"><small>Total fees recorded</small><strong>${fees.reduce((a,x)=>a+Number(x.amount||0),0).toLocaleString()}</strong></div></div>
      <div class="grid-2"><div class="panel"><h3>Average Student Marks by Term</h3><p class="muted">Average of individual saved assessment marks, out of 100.</p>${bars(academic,maxAcademic,'avg',v=>v+'/100')}<div class="muted" style="font-size:12px">Records per term: ${academic.map(x=>`${x.term}: ${x.count}`).join(' · ')}</div></div>
      <div class="panel"><h3>Fee Payments by Term</h3><p class="muted">Total payment amounts grouped by the selected term on each payment record.</p>${bars(payment,maxFees,'total',v=>Number(v).toLocaleString())}<div class="muted" style="font-size:12px">Transactions per term: ${payment.map(x=>`${x.term}: ${x.count}`).join(' · ')}</div><h4>Share of recorded fee payments</h4>${payment.map(x=>{const rate=totalFees?Math.round(x.total/totalFees*100):0;return `<div style="display:grid;grid-template-columns:75px 1fr 55px;gap:10px;align-items:center;margin:10px 0"><b>${escape(x.term)}</b><div style="height:14px;background:#edf2f7;border-radius:8px;overflow:hidden"><div style="height:100%;width:${rate}%;background:var(--success);border-radius:8px"></div></div><strong>${rate}%</strong></div>`}).join('')}</div></div>
      <div class="panel"><h3>Term Summary</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Term</th><th>Average mark</th><th>Mark records</th><th>Fees collected</th><th>Payment records</th></tr></thead><tbody>${terms.map(t=>`<tr><td>${t}</td><td>${academic.find(x=>x.term===t).avg}/100</td><td>${academic.find(x=>x.term===t).count}</td><td>${payment.find(x=>x.term===t).total.toLocaleString()}</td><td>${payment.find(x=>x.term===t).count}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function assessmentsView(u){
    const teacherSubjects=u.role==="teacher"?u.subjects:subjects;
    return `<div class="page-head"><div><h2>${u.role==="teacher"?"Teacher Record Sheet":"Assessment Monitoring"}</h2><p>Choose a class and subject. The full class list appears automatically so marks can be entered row-by-row.</p></div></div>
      <div class="panel record-controls">
        <div class="record-top">${classTabs("S1","Biguli.selectRecordClass")}</div>
        <div class="form-grid">
          <label>Class<select id="recordClass" onchange="Biguli.renderClassRecordSheet()">${classes.map(c=>`<option>${c}</option>`).join("")}</select></label>
          <label>Subject<select id="recordSubject" onchange="Biguli.renderClassRecordSheet()">${teacherSubjects.map(s=>`<option>${escape(s)}</option>`).join("")}</select></label>
          <label>Term<select id="recordTerm" onchange="Biguli.renderClassRecordSheet()">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label>
          <label>Assessment / Paper<input id="recordAssessment" value="End of Term Examination" oninput="Biguli.renderClassRecordSheet()"></label>
        </div>
      </div>
      <div class="panel"><div id="classRecordSheet"></div></div>`;
  }

  function selectRecordClass(cls){
    const select=document.getElementById("recordClass");
    if(select){select.value=cls;renderClassRecordSheet();}
  }

  function renderClassRecordSheet(){
    const wrap=document.getElementById("classRecordSheet"); if(!wrap)return;
    const cls=document.getElementById("recordClass")?.value || "S1";
    const subject=document.getElementById("recordSubject")?.value || (currentUser()?.subjects?.[0] || subjects[0]);
    const term=document.getElementById("recordTerm")?.value || "Term 1";
    const assessment=document.getElementById("recordAssessment")?.value || "End of Term Examination";
    const learners=get(KEY.learners).filter(l=>l.className===cls).sort((a,b)=>a.name.localeCompare(b.name));
    const existing=get(KEY.assessments);
    const u=currentUser();
    const allowed=u.role==="admin" || (u.subjects||[]).includes(subject);
    const records=learners.map(l=>{
      const matches=existing.filter(a=>a.learnerId===l.id && a.subject===subject && a.term===term && a.assessment===assessment);
      return {l,mark:matches.length?matches[matches.length-1].mark:"",id:matches.length?matches[matches.length-1].id:""};
    });
    document.querySelectorAll(".class-tab").forEach(b=>b.classList.toggle("active",b.textContent.trim().startsWith(cls)));
    wrap.innerHTML=`<div class="sheet-title"><div><strong>${cls} — ${escape(subject)}</strong><span>${escape(term)} • ${escape(assessment)}</span></div><span>${learners.length} learner(s)</span></div>
      ${!allowed?'<div class="message error">You are not authorised to enter this subject.</div>':''}
      <div class="table-wrap"><table class="data-table mark-sheet"><thead><tr><th>#</th><th>Student ID</th><th>Learner Name</th><th>Stream</th><th>Mark / 100</th><th>Grade</th></tr></thead><tbody>${records.length?records.map((r,i)=>`<tr><td>${i+1}</td><td><b>${escape(r.l.admission)}</b></td><td>${escape(r.l.name)}</td><td>${escape(r.l.stream)}</td><td><input class="mark-input" data-learner="${r.l.id}" value="${r.mark}" type="number" min="0" max="100" ${allowed?"":"disabled"} placeholder="—"></td><td class="live-grade">${r.mark===""?"":grade(r.mark)}</td></tr>`).join(""):'<tr><td colspan="6" class="empty">No learners registered in this class.</td></tr>'}</tbody></table></div>
      <div class="sheet-footer"><span class="muted">Leave a mark blank when the learner has no mark recorded.</span><button class="btn btn-primary" ${allowed?"":"disabled"} onclick="Biguli.saveClassMarks()">Save ${cls} ${escape(subject)} Marks</button></div>`;
    wrap.querySelectorAll(".mark-input").forEach(input=>input.addEventListener("input",()=>{
      const cell=input.closest("tr")?.querySelector(".live-grade");
      if(cell) cell.textContent=input.value===""?"":grade(input.value);
    }));
  }

  async function syncAssessmentRecords(){
    const response=await fetch("/api/assessments",{cache:"no-store"});
    if(!response.ok) throw new Error("Could not load assessment records.");
    const result=await response.json();
    if(!Array.isArray(result.assessments)) throw new Error("The server returned invalid assessment data.");
    const learnersByAdmission=new Map(get(KEY.learners).map(learner=>[String(learner.admission||"").toUpperCase(),learner.id]));
    const records=result.assessments.map(record=>({
      ...record,
      learnerId:learnersByAdmission.get(String(record.admission||"").toUpperCase())||record.learnerId
    }));
    save(KEY.assessments,records);
    setServerStatus("connected","Marks server connected");
  }

  async function saveClassMarks(){
    const u=currentUser();
    const cls=document.getElementById("recordClass")?.value || "S1";
    const subject=document.getElementById("recordSubject")?.value || subjects[0];
    const term=document.getElementById("recordTerm")?.value || "Term 1";
    const assessment=document.getElementById("recordAssessment")?.value || "End of Term Examination";
    if(u.role==="teacher" && !(u.subjects||[]).includes(subject)){notify("You are not authorised for this subject.");return;}
    const inputs=[...document.querySelectorAll(".mark-input")];
    const admissions=new Map(get(KEY.learners).map(learner=>[learner.id,learner.admission]));
    const now=new Date().toISOString();
    const records=inputs.map(input=>({
      learnerId:input.dataset.learner,
      admission:admissions.get(input.dataset.learner),
      subject,
      term,
      assessment,
      mark:input.value.trim()===""?"":Number(input.value),
      teacherId:u.id,
      date:now
    }));
    try{
      const response=await fetch("/api/assessments",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({records})
      });
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not save marks.");
      save(KEY.assessments,result.assessments);
      setServerStatus("connected","Marks server connected");
      renderClassRecordSheet();
      notify(`${cls} ${subject} marks saved to the server.`);
    }catch(error){
      setServerStatus("offline","Marks server offline — start data.py");
      notify("Server unavailable. Marks were not saved; start data.py and try again.");
    }
  }

  function activitiesView(u){
    const rows=get(KEY.activities).filter(a=>u.role==="admin" || a.teacherId===u.id);
    return `<div class="page-head"><div><h2>Activities of Integration</h2><p>Record practical work, projects and integrated learning.</p></div></div>
      <div class="panel"><form onsubmit="Biguli.saveActivity(event)">
        <div class="form-grid"><label>Class<select name="className">${classes.map(c=>`<option>${c}</option>`).join("")}</select></label>
        <label>Learner<select name="learnerId" required>${get(KEY.learners).map(l=>`<option value="${l.id}">${escape(l.admission)} — ${escape(l.name)} (${l.className})</option>`).join("")}</select></label>
        <label>Subject / Area<select name="subject" required>${(u.role==="teacher"?u.subjects:subjects).map(s=>`<option>${escape(s)}</option>`).join("")}</select></label>
        <label>Activity title<input name="title" required></label>
        <label>Score /20<input name="score" type="number" min="0" max="20"></label>
        <label class="full">Description<textarea name="description" placeholder="Describe the activity, task or evidence."></textarea></label></div>
        <button class="btn btn-primary">Save Activity</button>
      </form></div>
      <div class="panel"><h3>Activity records</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Learner</th><th>Class</th><th>Area</th><th>Activity</th><th>Score</th><th>Teacher</th></tr></thead><tbody>${rows.length?rows.slice().reverse().map(a=>{const l=get(KEY.learners).find(x=>x.id===a.learnerId),t=get(KEY.users).find(x=>x.id===a.teacherId);return `<tr><td>${escape(l?.name||"")}</td><td>${escape(l?.className||a.className||"")}</td><td>${escape(a.subject)}</td><td>${escape(a.title)}</td><td>${a.score??""}</td><td>${escape(t?.name||"")}</td></tr>`}).join(""):'<tr><td colspan="6" class="empty">No activities recorded.</td></tr>'}</tbody></table></div></div>`;
  }

  function saveActivity(e){
    e.preventDefault();
    const u=currentUser();
    if(!u || !["admin","teacher"].includes(u.role)){notify("Only authorised staff can enter marks.");return;}
    const d=Object.fromEntries(new FormData(e.target));
    if(u.role==="teacher" && !(u.subjects||[]).includes(d.subject)){notify("You can only enter marks for your assigned subjects.");return;}
    save(KEY.activities,[...get(KEY.activities),{id:id(),...d,score:d.score?Number(d.score):null,teacherId:u.id,date:new Date().toISOString()}]);
    route("activities");notify("Activity saved.");
  }

  function reportsView(){
    return `<div class="panel no-print"><h3>Portable school data (USB flash drive)</h3>
      <p class="muted">Export a backup file to your flash drive before leaving this computer. On another computer, open this same school folder and import that backup. Importing replaces the data currently in this browser.</p>
      <div class="toolbar"><button class="btn btn-light" onclick="Biguli.exportBackup()">Export all school data to JSON</button>
      <label class="btn btn-light" for="schoolBackupFile">Import backup from flash drive</label><input id="schoolBackupFile" type="file" accept=".json,application/json" style="max-width:260px" onchange="Biguli.importBackup(event)"></div></div>
      <div class="panel no-print"><h3>Class Reports</h3><p>Select one class to show every learner's report for that class only. Use Print / Save PDF to print the full class report pack.</p>
        <div class="form-grid"><label>Class<select id="reportClass" onchange="document.getElementById('classReportArea').innerHTML=''"><option>S1</option><option>S2</option><option>S3</option><option>S4</option><option>S5</option><option>S6</option></select></label>
        <label>Term<select id="reportTerm">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label>
        <div style="align-self:end"><button class="btn btn-primary" onclick="Biguli.generateClassReports()">Show Class Reports</button></div></div></div>
      <div id="classReportArea"></div>`;
  }

  function buildReportHtml(learner,term){
    const reportSubjects=subjectsForClass(learner.className);
    const all=get(KEY.assessments).filter(a=>a.learnerId===learner.id&&(!a.term||a.term===term));
    const acts=get(KEY.activities).filter(a=>a.learnerId===learner.id&&(!a.term||a.term===term));
    const subjectRows=reportSubjects.map(subject=>{
      const marks=all.filter(a=>a.subject===subject).map(a=>Number(a.mark)).filter(Number.isFinite);
      const assessment100=marks.length?marks.reduce((a,b)=>a+b,0)/marks.length:null;
      const assessment80=assessment100==null?null:Math.round(assessment100*0.8);
      const subjectActs=acts.filter(a=>a.subject===subject);
      let activity20=null;
      if(subjectActs.length){ const vals=subjectActs.map(a=>Number(a.score)).filter(Number.isFinite); if(vals.length) activity20=Math.min(20,Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)); }
      const total=assessment80==null&&activity20==null?"":(assessment80||0)+(activity20||0);
      return {subject,assessment80:assessment80==null?"":assessment80,activity20:activity20==null?"":activity20,total,grade:total===""?"":grade(total)};
    });
    const filled=subjectRows.filter(x=>x.total!=="").map(x=>x.total), average=filled.length?Math.round(filled.reduce((a,b)=>a+b,0)/filled.length):"",year=new Date().getFullYear();
    return `<div class="report-card"><div class="report-header"><div class="report-school-name"><h2>BIGULI SECONDARY SCHOOL</h2><div class="report-motto">ACADEMIC LEARNER REPORT • ${escape(term).toUpperCase()} • ${year}</div></div><img class="report-logo" src="PGN.PNG" alt="Biguli Secondary School badge"></div><div class="report-rule"></div><div class="report-meta"><div><b>Student ID:</b> ${escape(learner.admission)}</div><div><b>Learner Name:</b> ${escape(learner.name)}</div><div><b>Class:</b> ${escape(learner.className)}</div><div><b>Stream:</b> ${escape(learner.stream)}</div><div><b>Gender:</b> ${escape(learner.gender)}</div><div><b>Date of Birth:</b> ${escape(learner.dob)}</div></div><h3 class="report-section-title">ACADEMIC PERFORMANCE</h3><table class="data-table report-table"><thead><tr><th>No.</th><th>Subject</th><th>Assessment /80</th><th>AOI /20</th><th>Total /100</th><th>Grade</th></tr></thead><tbody>${subjectRows.map((r,i)=>`<tr><td>${i+1}</td><td>${escape(r.subject)}</td><td>${r.assessment80}</td><td>${r.activity20}</td><td><b>${r.total}</b></td><td><b>${r.grade}</b></td></tr>`).join("")}<tr class="total-row"><td colspan="2"><b>OVERALL AVERAGE</b></td><td colspan="2"></td><td><b>${average}</b></td><td><b>${average===""?"":grade(average)}</b></td></tr></tbody></table><div class="report-summary"><div><b>Subjects with results:</b> ${filled.length}/${reportSubjects.length}</div><div><b>Overall average:</b> ${average===""?"—":average}/100</div><div><b>Overall grade:</b> ${average===""?"—":grade(average)}</div></div><div class="report-comments"><div><b>Class Teacher's Comment:</b><br><span>____________________________________________________________</span><br><span>____________________________________________________________</span></div><div><b>Head Teacher's Comment:</b><br><span>____________________________________________________________</span><br><span>____________________________________________________________</span></div></div><div class="signatures"><span>Class Teacher: ____________________</span><span>Head Teacher: ____________________</span><span>Date: ____________________</span></div><div class="report-footer">BIGULI SECONDARY SCHOOL • Academic Management System</div></div>`;
  }

  function generateClassReports(){
    if(currentUser()?.role!=="admin"){notify("Only administrators can generate class reports.");return;}
    const cls=document.getElementById("reportClass")?.value||"S1";
    const term=document.getElementById("reportTerm")?.value||"Term 1";
    const learners=get(KEY.learners).filter(l=>l.className===cls).sort((a,b)=>a.name.localeCompare(b.name));
    const area=document.getElementById("classReportArea"); if(!area)return;
    if(!learners.length){area.innerHTML=`<div class="panel empty">No learners are registered in ${escape(cls)}.</div>`;return;}
    area.innerHTML=`<div class="report-actions no-print"><button class="btn btn-primary" onclick="window.print()">Print / Save all ${learners.length} reports</button><button class="btn btn-light" onclick="document.getElementById('classReportArea').innerHTML=''">Clear preview</button></div><div class="class-report-pack">${learners.map(l=>buildReportHtml(l,term)).join("")}</div>`;
  }

  function exportBackup(){
    const backup={format:"biguli-school-backup",version:1,exportedAt:new Date().toISOString(),data:{}};
    Object.entries(KEY).forEach(([name,key])=>{if(name!=="session")backup.data[key]=get(key);});
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`biguli-school-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);notify("Backup exported. Save it on your flash drive.");
  }

  function importBackup(event){
    if(currentUser()?.role!=="admin"){notify("Only administrators can import backups.");return;}
    const file=event.target.files?.[0];if(!file)return;
    const reader=new FileReader();reader.onload=()=>{
      try{
        const backup=JSON.parse(reader.result);
        if(backup.format!=="biguli-school-backup"||!backup.data||typeof backup.data!=="object")throw new Error("Invalid backup file");
        if(!confirm("Importing replaces the current data in this browser. Export a backup first if needed. Continue?"))return;
        Object.entries(KEY).forEach(([name,key])=>{if(name!=="session"&&Array.isArray(backup.data[key]))save(key,backup.data[key]);});
        notify("Backup imported. Reloading school portal...");setTimeout(()=>location.reload(),500);
      }catch(err){notify("Could not import this backup file. Please select a valid Biguli backup.");}
      finally{event.target.value="";}
    };reader.readAsText(file);
  }


  function attendanceView(){
    const today=new Date().toISOString().slice(0,10), rows=get(KEY.attendance);
    return `<div class="page-head"><div><h2>Daily Attendance</h2><p>Select a class and date, then mark the whole register.</p></div></div><div class="panel"><div class="form-grid"><label>Class<select id="attClass">${classes.map(c=>`<option>${c}</option>`).join("")}</select></label><label>Date<input id="attDate" type="date" value="${today}"></label><label>Term<select id="attTerm">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label></div><div id="attendanceSheet" class="table-wrap" style="margin-top:18px"></div><button class="btn btn-primary" onclick="Biguli.saveAttendance()">Save Attendance</button></div>`;
  }
  function saveAttendance(){
    const cls=document.getElementById("attClass").value,date=document.getElementById("attDate").value,term=document.getElementById("attTerm").value; let rows=get(KEY.attendance), now=new Date().toISOString();
    const learners=get(KEY.learners).filter(l=>l.className===cls); const statuses=[...document.querySelectorAll("[data-attendance]")];
    statuses.forEach(x=>{const learnerId=x.dataset.attendance, status=x.value; const i=rows.findIndex(r=>r.learnerId===learnerId&&r.date===date&&r.term===term); const rec={id:i>=0?rows[i].id:id(),learnerId,className:cls,date,term,status,teacherId:currentUser().id,updatedAt:now}; if(i>=0)rows[i]=rec;else rows.push(rec)}); save(KEY.attendance,rows); notify("Attendance saved.");
  }
  function renderAttendanceSheet(){ const el=document.getElementById("attendanceSheet"); if(!el)return; const cls=document.getElementById("attClass").value,date=document.getElementById("attDate").value,term=document.getElementById("attTerm").value, rows=get(KEY.attendance); const ls=get(KEY.learners).filter(l=>l.className===cls); el.innerHTML=`<table class="data-table"><thead><tr><th>#</th><th>Student ID</th><th>Learner</th><th>Stream</th><th>Status</th></tr></thead><tbody>${ls.map((l,i)=>{const r=rows.find(x=>x.learnerId===l.id&&x.date===date&&x.term===term);return `<tr><td>${i+1}</td><td>${escape(l.admission)}</td><td>${escape(l.name)}</td><td>${escape(l.stream)}</td><td><select data-attendance="${l.id}"><option ${!r||r.status==="Present"?"selected":""}>Present</option><option ${r?.status==="Absent"?"selected":""}>Absent</option><option ${r?.status==="Late"?"selected":""}>Late</option><option ${r?.status==="Excused"?"selected":""}>Excused</option></select></td></tr>`}).join("")||'<tr><td colspan="5" class="empty">No students in this class.</td></tr>'}</tbody></table>`; }

  function paymentOptionsHtml(){
    return `<div class="panel payment-provider-panel">
      <h3>Pay School Fees Online</h3>
      <p class="muted">Choose a provider below. The provider page is displayed inside this portal where the provider permits embedding.</p>
      <div class="toolbar" role="group" aria-label="Payment provider tabs">
        <button type="button" class="btn btn-primary" onclick="Biguli.showPaymentProvider('airtel')">Airtel Money</button>
        <button type="button" class="btn btn-light" onclick="Biguli.showPaymentProvider('mtn')">MTN MoMo</button>
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3>Airtel Money</h3>
          <p><b>Kyamuhonga Peoples' SACCO</b><br><strong>21080078507</strong></p>
          <p class="muted" style="font-size:12px">Mobile money shortcut: *185#</p>
        </div>
        <div class="panel">
          <h3>MTN MoMo</h3>
          <p><b>Centenary Bank</b><br><strong>3201817371</strong></p>
          <p class="muted" style="font-size:12px">Mobile money shortcut: *165#</p>
        </div>
      </div>
      <div id="paymentProviderFrame" class="payment-provider-frame" aria-live="polite">
        <div class="payment-frame-placeholder"><h3>Select Airtel Money or MTN MoMo</h3><p>The provider's website will appear here if it allows embedded viewing.</p></div>
      </div>
      <p class="muted" style="font-size:12px">Note: Airtel or MTN may block display inside another website. If the embedded page is blank or shows an error, use the provider's mobile money menu on your phone. This demo portal does not process or verify payments itself.</p>
    </div>`;
  }

  function showPaymentProvider(provider){
    const frame=document.getElementById("paymentProviderFrame");
    if(!frame)return;
    const config={
      airtel:{url:"https://www.airtel.com/",name:"Airtel Money",ussd:"*185#"},
      mtn:{url:"https://www.mtn.com/",name:"MTN MoMo",ussd:"*165#"}
    }[provider];
    if(!config)return;
    frame.innerHTML=`<div class="payment-frame-heading"><strong>${config.name} provider website</strong><span>Payment menu: ${config.ussd}</span></div><iframe title="${config.name} provider website" src="${config.url}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" style="width:100%;height:520px;border:0;background:#fff" onerror="this.insertAdjacentHTML('afterend','<p>The provider site cannot be embedded here. Use the mobile money menu on your phone.</p>')"></iframe>`;
  }

  function studentFeesView(u){
    const rows=get(KEY.fees).filter(x=>x.learnerId===u.id);
    const total=rows.reduce((a,x)=>a+Number(x.amount||0),0);
    return `<div class="page-head"><div><h2>My Payments</h2><p>${escape(u.admission)} — ${escape(u.name)} — ${escape(u.className)} ${escape(u.stream||"")}</p></div></div>
      <div class="stats"><div class="stat-card"><small>My Payments</small><strong>${rows.length}</strong></div><div class="stat-card"><small>Total Paid</small><strong>${total.toLocaleString()}</strong></div></div>
      ${paymentOptionsHtml()}
      <div class="panel"><h3>Make / Record a Payment</h3>
        <p class="muted">After paying through your mobile-money menu, keep the transaction reference and record the payment below. Saving here is a local record only; it does not itself transfer money.</p>
        <form onsubmit="Biguli.saveStudentFee(event)">
          <div class="form-grid">
            <label>School ID<input value="${escape(u.admission)}" readonly></label>
            <label>Name<input value="${escape(u.name)}" readonly></label>
            <label>Class<input value="${escape(u.className)} ${escape(u.stream||"")}" readonly></label>
            <label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label>
            <label>Term<select name="term">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label>
            <label>Amount<input name="amount" type="number" min="0" required></label>
            <label>Payment Method<select name="method"><option>Cash</option><option>Airtel Money</option><option>MTN MoMo</option><option>Bank</option><option>Other</option></select></label>
            <label>Reference / Receipt No.<input name="reference"></label>
            <label>Purpose<input name="purpose" value="School Fees"></label>
          </div>
          <button class="btn btn-primary">Save Payment</button>
        </form>
      </div>
      <div class="panel"><h3>My Payment History</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Purpose</th></tr></thead><tbody>
      ${rows.length?rows.slice().reverse().map(r=>`<tr><td>${escape(r.date||"")}</td><td>${Number(r.amount||0).toLocaleString()}</td><td>${escape(r.method||"")}</td><td>${escape(r.reference||"")}</td><td>${escape(r.purpose||"School Fees")}</td></tr>`).join(""):'<tr><td colspan="5" class="empty">No payments recorded yet.</td></tr>'}
      </tbody></table></div></div>`;
  }

  function saveStudentFee(e){
    e.preventDefault();
    const u=currentUser();
    if(!u || u.role!=="student") return;
    const d=Object.fromEntries(new FormData(e.target));
    save(KEY.fees,[...get(KEY.fees),{
      id:id(), learnerId:u.id, admission:u.admission, studentName:u.name,
      className:u.className, stream:u.stream, ...d, amount:Number(d.amount),
      recordedBy:u.id, recordedByRole:"student", recordedAt:new Date().toISOString()
    }]);
    route("student-fees"); notify("Your payment has been recorded.");
  }

  function studentReportView(u){
    return `<div class="report-selector no-print">
      <div class="panel"><div class="page-head"><div><h2>My Academic Report</h2><p>Only your own report is available from this account.</p></div></div>
      <div class="student-identity"><strong>${escape(u.admission)} — ${escape(u.name)}</strong><span>${escape(u.className)} ${escape(u.stream||"")}</span></div>
      <div class="form-grid"><label>Term<select id="studentReportTerm">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label>
      <div style="align-self:end"><button class="btn btn-primary" onclick="Biguli.generateStudentReport()">View Report</button></div></div></div></div>
      <div id="studentReportArea"></div>`;
  }

  function generateStudentReport(u){
    u=u||currentUser();
    if(!u || u.role!=="student") return;
    const term=document.getElementById("studentReportTerm")?.value||"Term 1";
    const learner=get(KEY.learners).find(l=>l.id===u.id);
    if(!learner)return;
    document.getElementById("studentReportArea").innerHTML=buildReportHtml(learner,term);
  }

  function feesView(){ const rows=get(KEY.fees), total=rows.reduce((a,x)=>a+Number(x.amount||0),0); return `<div class="page-head"><div><h2>Fees & Finance</h2><p>Record student fee payments and view financial activity.</p></div></div>${paymentOptionsHtml()}<div class="stats"><div class="stat-card"><small>Total Payments</small><strong>${rows.length}</strong></div><div class="stat-card"><small>Collected</small><strong>${total.toLocaleString()}</strong></div></div><div class="panel"><form onsubmit="Biguli.saveFee(event)"><div class="form-grid"><label>Student<select name="learnerId">${get(KEY.learners).map(l=>`<option value="${l.id}">${escape(l.admission)} — ${escape(l.name)}</option>`).join("")}</select></label><label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Term<select name="term">${terms.map(t=>`<option>${t}</option>`).join("")}</select></label><label>Amount<input name="amount" type="number" min="0" required></label><label>Payment Method<select name="method"><option>Cash</option><option>Airtel Money</option><option>MTN MoMo</option><option>Bank</option><option>Other</option></select></label><label>Reference<input name="reference"></label><label>Purpose<input name="purpose" value="School Fees"></label></div><button class="btn btn-primary">Record Payment</button></form></div><div class="panel"><h3>Fee Transactions</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Reference</th><th>Purpose</th></tr></thead><tbody>${rows.slice().reverse().map(r=>{const l=get(KEY.learners).find(x=>x.id===r.learnerId);return `<tr><td>${escape(r.date)}</td><td>${escape(l?.admission||"")} — ${escape(l?.name||"")}</td><td>${Number(r.amount||0).toLocaleString()}</td><td>${escape(r.method)}</td><td>${escape(r.reference)}</td><td>${escape(r.purpose)}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">No fee transactions.</td></tr>'}</tbody></table></div></div>`; }
  function saveFee(e){
    if(currentUser()?.role!=="admin"){notify("Only the administrator can access school-wide finance.");return;}e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); save(KEY.fees,[...get(KEY.fees),{id:id(),...d,amount:Number(d.amount),recordedBy:currentUser().id}]); route("fees"); notify("Fee payment recorded.");}

  function inventoryView(){ const rows=get(KEY.inventory); return `<div class="page-head"><div><h2>Assets & Inventory</h2><p>Register school property, stock and asset movement.</p></div></div><div class="panel"><form onsubmit="Biguli.saveInventory(event)"><div class="form-grid"><label>Asset / Item<input name="name" required></label><label>Category<select name="category"><option>Furniture</option><option>ICT</option><option>Laboratory</option><option>Library</option><option>Sports</option><option>Office</option><option>Other</option></select></label><label>Quantity<input name="quantity" type="number" min="1" value="1"></label><label>Condition<select name="condition"><option>Good</option><option>Fair</option><option>Damaged</option><option>Lost</option></select></label><label>Location<input name="location"></label><label>Asset Number<input name="assetNo" placeholder="Auto/manual reference"></label></div><button class="btn btn-primary">Add Inventory Item</button></form></div><div class="panel"><h3>Inventory Register</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Asset No.</th><th>Item</th><th>Category</th><th>Qty</th><th>Condition</th><th>Location</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.assetNo||"—")}</td><td>${escape(r.name)}</td><td>${escape(r.category)}</td><td>${escape(r.quantity)}</td><td>${escape(r.condition)}</td><td>${escape(r.location)}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">No inventory items.</td></tr>'}</tbody></table></div></div>`; }
  function saveInventory(e){e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); save(KEY.inventory,[...get(KEY.inventory),{id:id(),...d,quantity:Number(d.quantity||1),createdAt:new Date().toISOString()}]); route("inventory"); notify("Inventory item saved.");}

  function timetableView(){ const rows=get(KEY.timetable); return `<div class="page-head"><div><h2>School Timetable</h2><p>Manage class, subject, teacher and period allocations.</p></div></div><div class="panel"><form onsubmit="Biguli.saveTimetable(event)"><div class="form-grid"><label>Day<select name="day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select></label><label>Period<input name="period" placeholder="P1 / 8:00–8:40" required></label><label>Class<select name="className">${classes.map(c=>`<option>${c}</option>`).join("")}</select></label><label>Subject<select name="subject">${subjects.map(s=>`<option>${escape(s)}</option>`).join("")}</select></label><label>Teacher<select name="teacherId">${get(KEY.users).filter(x=>x.role==="teacher").map(t=>`<option value="${t.id}">${escape(t.name)}</option>`).join("")}</select></label><label>Room<input name="room"></label></div><button class="btn btn-primary">Add Lesson</button></form></div><div class="panel"><h3>Timetable</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Day</th><th>Period</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Room</th></tr></thead><tbody>${rows.map(r=>{const t=get(KEY.users).find(x=>x.id===r.teacherId);return `<tr><td>${escape(r.day)}</td><td>${escape(r.period)}</td><td>${escape(r.className)}</td><td>${escape(r.subject)}</td><td>${escape(t?.name||"")}</td><td>${escape(r.room)}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">No lessons added.</td></tr>'}</tbody></table></div></div>`; }
  function saveTimetable(e){e.preventDefault(); save(KEY.timetable,[...get(KEY.timetable),{id:id(),...Object.fromEntries(new FormData(e.target))}]); route("timetable"); notify("Timetable lesson saved.");}

  function disciplineView(){ const rows=get(KEY.discipline); return `<div class="page-head"><div><h2>Discipline & Learner Welfare</h2><p>Record incidents, action taken, counselling and follow-up.</p></div></div><div class="panel"><form onsubmit="Biguli.saveDiscipline(event)"><div class="form-grid"><label>Student<select name="learnerId">${get(KEY.learners).map(l=>`<option value="${l.id}">${escape(l.admission)} — ${escape(l.name)}</option>`).join("")}</select></label><label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Category<select name="category"><option>Discipline</option><option>Counselling</option><option>Welfare</option><option>Health</option><option>Other</option></select></label><label>Status<select name="status"><option>Open</option><option>Resolved</option><option>Follow-up</option></select></label><label class="full">Details<textarea name="details" required></textarea></label><label class="full">Action / Follow-up<textarea name="action"></textarea></label></div><button class="btn btn-primary">Save Record</button></form></div><div class="panel"><h3>Welfare & Discipline Records</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Student</th><th>Category</th><th>Status</th><th>Details</th><th>Action</th></tr></thead><tbody>${rows.slice().reverse().map(r=>{const l=get(KEY.learners).find(x=>x.id===r.learnerId);return `<tr><td>${escape(r.date)}</td><td>${escape(l?.admission||"")} — ${escape(l?.name||"")}</td><td>${escape(r.category)}</td><td>${escape(r.status)}</td><td>${escape(r.details)}</td><td>${escape(r.action)}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">No welfare records.</td></tr>'}</tbody></table></div></div>`; }
  function saveDiscipline(e){e.preventDefault(); save(KEY.discipline,[...get(KEY.discipline),{id:id(),...Object.fromEntries(new FormData(e.target)),recordedBy:currentUser().id}]); route("discipline"); notify("Welfare record saved.");}

  function exportLearners(){
    const rows=get(KEY.learners), header=["Student ID","Name","Gender","DOB","Class","Stream","Guardian","Phone"];
    const csv=[header,...rows.map(l=>[l.admission,l.name,l.gender,l.dob,l.className,l.stream,l.guardian,l.phone])].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="biguli_learners.csv";a.click();URL.revokeObjectURL(a.href);
  }

  function openModal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
  function closeModal(){document.getElementById("modal").classList.add("hidden")}
  function logout(){localStorage.removeItem(KEY.session);location.href="login.html"}

  window.Biguli={
    initLoginPage,initPortal,route,filterLearners,openLearnerForm,saveLearner,
    openTeacherForm,saveTeacher,saveAssessment:()=>{},saveActivity,
    generateClassReports,exportBackup,importBackup,exportLearners,openModal,closeModal,logout,
    selectRecordClass,renderClassRecordSheet,saveClassMarks,saveAttendance,saveFee,saveInventory,saveTimetable,saveDiscipline,showPaymentProvider
  };
  seed();
  document.addEventListener("DOMContentLoaded",()=>{
    if(document.getElementById("learnerTable"))filterLearners("S1");
    if(document.getElementById("classRecordSheet"))renderClassRecordSheet();
    if(document.getElementById("attendanceSheet")){ renderAttendanceSheet(); document.getElementById("attClass").addEventListener("change",renderAttendanceSheet); document.getElementById("attDate").addEventListener("change",renderAttendanceSheet); document.getElementById("attTerm").addEventListener("change",renderAttendanceSheet); }
  });
})();