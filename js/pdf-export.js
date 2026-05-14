/* ─── PDF Export ─── */
const PDFExport = (() => {
  async function exportPDF(element, monthName, year) {
    if (typeof html2pdf === 'undefined') {
      App.toast('html2pdf library not loaded.', 'error');
      return;
    }
    App.toast('Generating PDF...', 'info');
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Planify_${monthName}_${year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    try {
      await html2pdf().set(opt).from(element).save();
      App.toast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      App.toast('Failed to generate PDF: ' + err.message, 'error');
    }
  }

  function printPage() {
    window.print();
  }

  return { exportPDF, printPage };
})();
