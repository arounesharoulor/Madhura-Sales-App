const Report = require('../models/Report');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');
const { buildReportExcel } = require('../utils/excelBuilder');
const { sendMail } = require('../utils/mailer');

// @desc    Generate a status report
// @route   POST /api/reports
// @access  Private
exports.generateReport = async (req, res, next) => {
  try {
    const { title, type, startDate, endDate, customClientName, customProjectName, customSummary, customNextSteps, customQuotes, clientId } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const queryFilter = { createdAt: { $gte: start, $lte: end } };
    if (req.user.role === 'Field Executive') {
      queryFilter.executive = req.user.id;
    }

    const taskQueryFilter = { createdAt: { $gte: start, $lte: end } };
    if (req.user.role === 'Field Executive') {
      taskQueryFilter.assignedTo = req.user.id;
    }

    if (clientId) {
      const ClientOnboarding = require('../models/ClientOnboarding');
      const client = await ClientOnboarding.findById(clientId);
      if (client) {
        queryFilter.$or = [
          { clientName: client.ownerName },
          { clientName: client.clientName },
          { companyName: client.businessName },
          { companyName: client.companyName },
        ];
        taskQueryFilter.client = clientId;
      }
    }

    const totalTasks = await Task.countDocuments(taskQueryFilter);
    const completedTasks = await Task.countDocuments({ ...taskQueryFilter, status: 'Completed' });

    const meetings = await Meeting.find(queryFilter).populate('executive', 'name').lean();
    const totalMeetings = meetings.length;

    const followUps = await FollowUp.find(queryFilter).populate('executive', 'name').lean();
    const totalFollowUps = followUps.length;

    const totalExecutivesActive = await User.countDocuments({ role: 'Field Executive', isActive: true });

    const activities = [];
    meetings.forEach(m => {
      activities.push({
        executiveId: m.executive?._id,
        executiveName: m.executive?.name || 'Unknown',
        clientName: m.clientName,
        companyName: m.companyName,
        activityType: 'Meeting',
        date: m.createdAt,
        status: m.purpose,
        notes: m.outcome,
      });
    });

    followUps.forEach(f => {
      activities.push({
        executiveId: f.executive?._id,
        executiveName: f.executive?.name || 'Unknown',
        clientName: f.clientName,
        companyName: f.companyName,
        activityType: 'FollowUp',
        date: f.followUpDate,
        status: f.status,
        notes: f.notes,
      });
    });

    const tasks = await Task.find(taskQueryFilter).populate('assignedTo', 'name').populate('client').lean();
    tasks.forEach(t => {
      activities.push({
        executiveId: t.assignedTo?._id,
        executiveName: t.assignedTo?.name || 'Unknown',
        clientName: t.client?.ownerName || t.client?.clientName,
        companyName: t.client?.businessName || t.client?.companyName,
        activityType: 'Task',
        date: t.completedAt || t.createdAt,
        status: t.status,
        notes: t.description,
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    const report = await Report.create({
      title,
      type,
      startDate: start,
      endDate: end,
      generatedBy: req.user.id,
      summary: { totalTasks, completedTasks, totalMeetings, totalFollowUps, totalExecutivesActive },
      activities,
      customClientName,
      customProjectName,
      customSummary,
      customNextSteps,
      customQuotes,
    });

    if (req.user.role === 'Field Executive') {
      const Notification = require('../models/Notification');
      const admins = await User.find({ role: { $in: ['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'] }, isActive: true }).select('_id');
      await Promise.all(
        admins.map(async (admin) => {
          const notif = await Notification.create({
            recipient: admin._id,
            sender: req.user.id,
            title: 'New Report Submitted',
            message: `${req.user.name} submitted a new report: ${title}.`,
            type: 'Task',
          });
          if (req.io) req.io.to(admin._id.toString()).emit('notification', notif);
        })
      );
    }

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports list
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'Field Executive') {
      query.generatedBy = req.user.id;
    }
    const reports = await Report.find(query)
      .populate('generatedBy', 'name role')
      .sort({ createdAt: -1 }).lean();

    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a report (Admin can edit employee reports)
// @route   PUT /api/reports/:id
// @access  Private
exports.updateReport = async (req, res, next) => {
  try {
    const { title, type, customClientName, customProjectName, customSummary, customNextSteps, customQuotes } = req.body;
    
    let report = await Report.findById(req.params.id);
    if (!report) { res.status(404); throw new Error('Report not found'); }
    
    const isAdmin = ['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(req.user.role);
    if (!isAdmin && report.generatedBy.toString() !== req.user.id) {
      res.status(403); throw new Error('Not authorized to update this report');
    }

    if (title) report.title = title;
    if (type) report.type = type;
    if (customClientName !== undefined) report.customClientName = customClientName;
    if (customProjectName !== undefined) report.customProjectName = customProjectName;
    if (customSummary !== undefined) report.customSummary = customSummary;
    if (customNextSteps !== undefined) report.customNextSteps = customNextSteps;
    if (customQuotes !== undefined) report.customQuotes = customQuotes;
    
    await report.save();
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Download report as Excel file
// @route   GET /api/reports/:id/download
// @access  Private
exports.downloadReportExcel = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).populate('generatedBy', 'name');
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }

    const buffer = await buildReportExcel(report);
    const filename = `report_${report.title.replace(/\s+/g, '_')}_${new Date(report.startDate).toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Send report as Excel to a client email (Admin only)
// @route   POST /api/reports/:id/send-email
// @access  Private/Admin
exports.sendReportEmail = async (req, res, next) => {
  try {
    const { clientEmail, clientName, message } = req.body;
    if (!clientEmail) {
      res.status(400);
      throw new Error('Client email is required');
    }

    const report = await Report.findById(req.params.id).populate('generatedBy', 'name');
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }

    const buffer = await buildReportExcel(report);
    const filename = `report_${report.title.replace(/\s+/g, '_')}.xlsx`;

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0284c7;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">Madhura Sales — Activity Report</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p>Dear <strong>${clientName || 'Client'}</strong>,</p>
          <p>${message || `Please find attached the <strong>${report.title}</strong> activity report for the period <strong>${new Date(report.startDate).toLocaleDateString('en-IN')} – ${new Date(report.endDate).toLocaleDateString('en-IN')}</strong>.`}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border-radius:8px;overflow:hidden">
            <tr style="background:#eff6ff"><td style="padding:10px 14px;font-weight:600">Report</td><td style="padding:10px 14px">${report.title}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Period</td><td style="padding:10px 14px">${new Date(report.startDate).toLocaleDateString('en-IN')} – ${new Date(report.endDate).toLocaleDateString('en-IN')}</td></tr>
            <tr style="background:#eff6ff"><td style="padding:10px 14px;font-weight:600">Meetings</td><td style="padding:10px 14px">${report.summary?.totalMeetings || 0}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Follow-Ups</td><td style="padding:10px 14px">${report.summary?.totalFollowUps || 0}</td></tr>
          </table>
          <p style="color:#64748b;font-size:12px">The detailed Excel report is attached to this email.</p>
          <p style="color:#64748b;font-size:12px">— Madhura Sales Team</p>
        </div>
      </div>
    `;

    await sendMail({
      to: clientEmail,
      subject: `[Madhura Sales] ${report.title} – Activity Report`,
      html: emailHtml,
      attachments: [{ filename, content: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
    });

    res.status(200).json({ success: true, message: `Report sent to ${clientEmail}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Custom Manual Excel Report
// @route   POST /api/reports/custom-download
// @access  Private
exports.generateCustomReport = async (req, res, next) => {
  try {
    const { clientName, projectName, summary, nextSteps, quotes } = req.body;
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = req.user.name || 'Madhura Sales App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Custom Client Report');

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    };

    const labelStyle = {
      font: { bold: true, color: { argb: 'FF0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
      alignment: { vertical: 'top', wrapText: true },
    };

    sheet.columns = [
      { key: 'field', width: 25 },
      { key: 'value', width: 60 },
    ];

    sheet.addRow(['CUSTOM CLIENT REPORT', '']).eachCell(cell => Object.assign(cell, headerStyle));
    sheet.mergeCells('A1:B1');
    sheet.getRow(1).height = 30;

    const addField = (label, value) => {
      const row = sheet.addRow([label, value || '—']);
      row.getCell(1).style = labelStyle;
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    };

    addField('Date Generated', new Date().toLocaleDateString('en-IN'));
    addField('Generated By', req.user.name);
    addField('Client / Company Name', clientName);
    addField('Project / Subject', projectName);
    sheet.addRow([]);
    
    sheet.addRow(['REPORT DETAILS', '']).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.mergeCells(`A${sheet.rowCount}:B${sheet.rowCount}`);
    
    addField('Executive Summary', summary);
    addField('Next Steps / Actions', nextSteps);
    addField('Quotations / Pricing', quotes);

    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Disposition', `attachment; filename="custom_report_${(clientName || 'client').replace(/[^a-z0-9]/gi, '_')}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Weekly Friday reminder – auto-send all weekly reports (called by cron)
exports.sendWeeklyFridayReminder = async () => {
  try {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const admins = await User.find({ role: 'Admin', isActive: true }).select('email name');
    if (!admins.length) return;

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0284c7;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">📊 Weekly Report Reminder</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p>This is your automated Friday reminder.</p>
          <p>Please log in to the <strong>Madhura Sales App</strong> to generate and send weekly activity reports to your clients.</p>
          <p style="background:#eff6ff;padding:14px;border-radius:8px;border-left:4px solid #0284c7">
            📅 Week: <strong>${startDate.toLocaleDateString('en-IN')} – ${endDate.toLocaleDateString('en-IN')}</strong>
          </p>
          <p style="color:#64748b;font-size:12px">— Madhura Sales Automated System</p>
        </div>
      </div>
    `;

    for (const admin of admins) {
      try {
        await sendMail({
          to: admin.email,
          subject: '📊 [Madhura Sales] Weekly Report Reminder – Friday',
          html: emailHtml,
        });
      } catch (e) {
        console.error(`Failed to send Friday reminder to ${admin.email}:`, e.message);
      }
    }
    console.log(`✅ Friday weekly reminders sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error('Weekly reminder error:', error.message);
  }
};
