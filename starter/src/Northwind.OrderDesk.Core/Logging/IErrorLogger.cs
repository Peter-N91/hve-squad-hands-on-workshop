using System;

namespace Northwind.OrderDesk.Core.Logging
{
    public interface IErrorLogger
    {
        void LogError(string message, Exception exception);
        void LogInformation(string message);
    }
}
