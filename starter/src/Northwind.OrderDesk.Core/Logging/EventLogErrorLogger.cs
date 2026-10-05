using System;
using System.Diagnostics;

namespace Northwind.OrderDesk.Core.Logging
{
    /// <summary>
    /// Writes to the Windows Application event log under the source "Northwind Order Desk".
    /// The source is created by the installation script on NWWEB01.
    /// </summary>
    public class EventLogErrorLogger : IErrorLogger
    {
        private const string Source = "Northwind Order Desk";

        public void LogError(string message, Exception exception)
        {
            var text = exception == null ? message : message + Environment.NewLine + exception;
            EventLog.WriteEntry(Source, text, EventLogEntryType.Error);
        }

        public void LogInformation(string message)
        {
            EventLog.WriteEntry(Source, message, EventLogEntryType.Information);
        }
    }
}
