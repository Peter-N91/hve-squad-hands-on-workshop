using System;
using System.Collections.Generic;
using Northwind.OrderDesk.Core.Logging;

namespace Northwind.OrderDesk.Tests.Fakes
{
    public class RecordingLogger : IErrorLogger
    {
        public List<string> Errors { get; } = new List<string>();
        public List<string> Information { get; } = new List<string>();

        public void LogError(string message, Exception exception)
        {
            Errors.Add(message);
        }

        public void LogInformation(string message)
        {
            Information.Add(message);
        }
    }
}
