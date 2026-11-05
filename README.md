# Biguli Secondary School — Upgraded HTML/CSS/JavaScript Edition

This package is a browser-based prototype of the Biguli Secondary School academic management portal.

## Main upgrades

- Uses the supplied `PGN.PNG` image as the Biguli Secondary School badge/logo.
- Automatically generates unique Student IDs in the format `BSS0001`, `BSS0002`, `BSS0003` and so on.
- Separate class sheets for **S1, S2, S3, S4, S5 and S6**.
- Learner registration is organised by class and the generated Student ID cannot be manually duplicated.
- Teacher record sheet: a teacher selects **class + subject + term + assessment**, then the full list of learners in that class appears with a mark field for each learner.
- Teachers are limited to the subjects assigned to their accounts.
- Marks can be updated for the same class/subject/term/assessment without creating duplicate rows.
- Reports show **all configured subjects**, whether a mark is filled in or left blank.
- Reports use a school-style A4 layout with `BIGULI SECONDARY SCHOOL`, `REPUBLIC OF UGANDA`, learner details, subject performance, grades, activities, comments and signature areas, with the supplied badge logo at the right of the school header.
- Reports can be printed or saved as PDF using the browser print dialog.

## Files

- `index.html` — public school website
- `login.html` — staff login
- `portal.html` — admin/teacher dashboard
- `styles.css` — responsive design and print report styling
- `app.js` — application logic and browser storage
- `PGN.PNG` — supplied school badge/logo

## How to run the local marks server

1. Install Python 3 if it is not already installed.
2. Open a terminal in this folder and run `python data.py`.
3. Keep that terminal open, then open `http://127.0.0.1:8000` in Chrome, Edge or Firefox. The Python server serves the website and its `/api/health` and `/api/assessments` endpoints from the same origin.
4. Sign in through **Staff Login**. The portal shows the marks-server connection status; teacher and administrator marks are loaded from and saved to the Python server.

Assessment records are stored in `biguli_data.json`, created beside `data.py` after the first mark is saved. Keep the server running while using the portal. Do not open `portal.html` directly with `file://`; use the server URL above so browser requests reach the API.

## Important security limitation

This remains a prototype. The marks API is bound to `127.0.0.1` and has no server-side login or role verification; the existing login and other school data still use browser `localStorage`. Do not expose this server to a school network or the internet, and do not use it for confidential real learner records. A production deployment needs server-side authentication, verified teacher permissions, a database, HTTPS, audit logs and backups.

For real deployment, use server-side authentication, a database, hashed passwords, server-side teacher permissions, HTTPS, audit logs and backups.


## School Monitor-style feature upgrade
This edition adds school-management modules inspired by the public School Monitor feature description: students/classes, attendance, academic results, fees/finance, staff, assets/inventory, timetable, discipline/welfare and reports. The implementation is Biguli-specific and retains the supplied badge, S1-S6 classes, automatic BSS student IDs and teacher subject permissions.

Academic reports use Assessment /80 + Activity of Integration /20 = Total /100.


## Requested report and subject changes

- Admin report preview selects exactly one class (S1-S6) and displays every learner report from that class only. Print / Save PDF prints the class report pack.
- O-Level classes S1-S4 include ENT, Runyankore/Rukiga, and Art and Design in teacher subject assignments and reports.
- A-Level classes S5-S6 include GP, Submath, Sub-ICT, Literature, and Divinity in teacher subject assignments and reports.
- Existing subjects and workflows have been retained.

## Keeping data on a USB flash drive

This offline browser version stores active data in the browser profile, not directly in the HTML files. In Admin → Results & Reports, use **Export all school data to JSON** and save the downloaded backup onto your USB flash drive. On another PC, copy/open this folder, sign in as admin, choose **Import backup from flash drive**, and select that JSON file. Import replaces the current browser's school data, so keep multiple dated backups. Export again after making changes. Keep the flash drive secure because the backup contains private school data.

For direct shared storage across multiple PCs at the same time, a server/database application is required; a static HTML app cannot safely share one live database just by being on a flash drive.

## Payment website links

The student **My Payments** page and administrator **Fees / Finance** page include separate Airtel Money and MTN MoMo subsections. Each provides the requested public website link (`https://www.airtel.com/` or `https://www.mtn.com/`), the school's displayed account details, and the mobile-money USSD shortcut. These public corporate websites are not direct school-payment checkout pages; payment must be completed through a supported Airtel Money or MTN MoMo flow. A record entered into this static portal is not proof of payment.


## In-portal payment preview and term charts

- Student My Payments and administrator Fees / Finance show Airtel Money and MTN MoMo subsections with provider pages previewed inside the portal when those providers allow iframe embedding. Some external providers intentionally block embedding; in that case, use the mobile money USSD menu.
- Administrator → Term Analytics shows academic average marks by term, total recorded fees by term, transaction counts, and each term's share of recorded fee payments. Charts reflect data recorded in this browser and do not verify external payments.
- Login HTML and login/authentication flow were not changed.
