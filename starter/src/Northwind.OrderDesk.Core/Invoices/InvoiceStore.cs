using System;
using System.Configuration;
using System.Globalization;
using System.IO;

namespace Northwind.OrderDesk.Core.Invoices
{
    /// <summary>
    /// Reads invoice PDFs written by the finance system to the invoice share.
    /// Path layout: {InvoiceSharePath}\{year}\{invoiceNumber}.pdf
    /// </summary>
    public class InvoiceStore
    {
        private readonly string _sharePath;

        public InvoiceStore()
            : this(ConfigurationManager.AppSettings["InvoiceSharePath"])
        {
        }

        public InvoiceStore(string sharePath)
        {
            if (string.IsNullOrWhiteSpace(sharePath))
            {
                throw new ConfigurationErrorsException("appSettings 'InvoiceSharePath' is not configured.");
            }

            _sharePath = sharePath;
        }

        public string GetInvoicePath(string invoiceNumber, DateTime invoiceDate)
        {
            if (string.IsNullOrWhiteSpace(invoiceNumber)) throw new ArgumentException("Invoice number is required.", "invoiceNumber");
            if (invoiceNumber.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || invoiceNumber.Contains(".."))
            {
                throw new ArgumentException("Invoice number contains invalid characters.", "invoiceNumber");
            }

            return Path.Combine(_sharePath, invoiceDate.Year.ToString(CultureInfo.InvariantCulture), invoiceNumber + ".pdf");
        }

        public Stream OpenInvoice(string invoiceNumber, DateTime invoiceDate)
        {
            var path = GetInvoicePath(invoiceNumber, invoiceDate);
            if (!File.Exists(path))
            {
                return null;
            }

            return File.OpenRead(path);
        }
    }
}
