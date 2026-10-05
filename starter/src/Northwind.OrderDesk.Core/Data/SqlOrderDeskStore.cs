using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Core.Data
{
    /// <summary>
    /// ADO.NET data access for the NorthwindOrders database on NWSQL01.
    /// The connection string "OrderDesk" is read from Web.config (Integrated Security).
    /// </summary>
    public class SqlOrderDeskStore : IOrderRepository, IProductCatalog, IPriceAgreementSource
    {
        private readonly string _connectionString;

        public SqlOrderDeskStore()
        {
            var setting = ConfigurationManager.ConnectionStrings["OrderDesk"];
            if (setting == null)
            {
                throw new ConfigurationErrorsException("Connection string 'OrderDesk' is missing from Web.config.");
            }

            _connectionString = setting.ConnectionString;
        }

        public Order GetOrder(int orderId)
        {
            using (var connection = Open())
            {
                Order order = null;
                using (var command = Command(connection,
                    "SELECT Id, OrderNumber, CustomerId, OrderDate, Status, Channel, DeliveryAddress, InvoiceNumber, CreatedBy, OrderDiscountPercent, Total " +
                    "FROM dbo.Orders WHERE Id = @id"))
                {
                    command.Parameters.Add("@id", SqlDbType.Int).Value = orderId;
                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            order = ReadOrder(reader);
                        }
                    }
                }

                if (order == null)
                {
                    return null;
                }

                using (var command = Command(connection,
                    "SELECT LineNumber, ProductId, Sku, ProductName, Quantity, UnitPrice, DiscountPercent, LineTotal " +
                    "FROM dbo.OrderLines WHERE OrderId = @id ORDER BY LineNumber"))
                {
                    command.Parameters.Add("@id", SqlDbType.Int).Value = orderId;
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            order.Lines.Add(new OrderLine
                            {
                                LineNumber = reader.GetInt32(0),
                                ProductId = reader.GetInt32(1),
                                Sku = reader.GetString(2),
                                ProductName = reader.GetString(3),
                                Quantity = reader.GetInt32(4),
                                UnitPrice = reader.GetDecimal(5),
                                DiscountPercent = reader.GetDecimal(6),
                                LineTotal = reader.GetDecimal(7)
                            });
                        }
                    }
                }

                return order;
            }
        }

        public IList<Order> GetOrdersForCustomer(int customerId, DateTime fromDate)
        {
            var result = new List<Order>();
            using (var connection = Open())
            using (var command = Command(connection,
                "SELECT Id, OrderNumber, CustomerId, OrderDate, Status, Channel, DeliveryAddress, InvoiceNumber, CreatedBy, OrderDiscountPercent, Total " +
                "FROM dbo.Orders WHERE CustomerId = @customerId AND OrderDate >= @fromDate ORDER BY OrderDate DESC"))
            {
                command.Parameters.Add("@customerId", SqlDbType.Int).Value = customerId;
                command.Parameters.Add("@fromDate", SqlDbType.DateTime).Value = fromDate;
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(ReadOrder(reader));
                    }
                }
            }

            return result;
        }

        public Customer GetCustomer(int customerId)
        {
            using (var connection = Open())
            using (var command = Command(connection,
                "SELECT Id, Code, Name, CountryCode, Tier, DefaultDeliveryAddress, IsActive FROM dbo.Customers WHERE Id = @id"))
            {
                command.Parameters.Add("@id", SqlDbType.Int).Value = customerId;
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read())
                    {
                        return null;
                    }

                    return new Customer
                    {
                        Id = reader.GetInt32(0),
                        Code = reader.GetString(1),
                        Name = reader.GetString(2),
                        CountryCode = reader.GetString(3),
                        Tier = (CustomerTier)reader.GetByte(4),
                        DefaultDeliveryAddress = reader.GetString(5),
                        IsActive = reader.GetBoolean(6)
                    };
                }
            }
        }

        public int SaveNewOrder(Order order)
        {
            using (var connection = Open())
            using (var transaction = connection.BeginTransaction())
            {
                int orderId;
                using (var command = Command(connection,
                    "INSERT INTO dbo.Orders (OrderNumber, CustomerId, OrderDate, Status, Channel, DeliveryAddress, CreatedBy, OrderDiscountPercent, Total) " +
                    "VALUES (@number, @customerId, @date, @status, @channel, @address, @createdBy, @discount, @total); SELECT CAST(SCOPE_IDENTITY() AS int);"))
                {
                    command.Transaction = transaction;
                    command.Parameters.Add("@number", SqlDbType.NVarChar, 20).Value = order.OrderNumber;
                    command.Parameters.Add("@customerId", SqlDbType.Int).Value = order.CustomerId;
                    command.Parameters.Add("@date", SqlDbType.DateTime).Value = order.OrderDate;
                    command.Parameters.Add("@status", SqlDbType.TinyInt).Value = (byte)order.Status;
                    command.Parameters.Add("@channel", SqlDbType.TinyInt).Value = (byte)order.Channel;
                    command.Parameters.Add("@address", SqlDbType.NVarChar, 400).Value = order.DeliveryAddress;
                    command.Parameters.Add("@createdBy", SqlDbType.NVarChar, 100).Value = order.CreatedBy;
                    command.Parameters.Add("@discount", SqlDbType.Decimal).Value = order.OrderDiscountPercent;
                    command.Parameters.Add("@total", SqlDbType.Decimal).Value = order.Total;
                    orderId = (int)command.ExecuteScalar();
                }

                foreach (var line in order.Lines)
                {
                    using (var command = Command(connection,
                        "INSERT INTO dbo.OrderLines (OrderId, LineNumber, ProductId, Sku, ProductName, Quantity, UnitPrice, DiscountPercent, LineTotal) " +
                        "VALUES (@orderId, @line, @productId, @sku, @name, @quantity, @price, @discount, @total)"))
                    {
                        command.Transaction = transaction;
                        command.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                        command.Parameters.Add("@line", SqlDbType.Int).Value = line.LineNumber;
                        command.Parameters.Add("@productId", SqlDbType.Int).Value = line.ProductId;
                        command.Parameters.Add("@sku", SqlDbType.NVarChar, 20).Value = line.Sku;
                        command.Parameters.Add("@name", SqlDbType.NVarChar, 200).Value = line.ProductName;
                        command.Parameters.Add("@quantity", SqlDbType.Int).Value = line.Quantity;
                        command.Parameters.Add("@price", SqlDbType.Decimal).Value = line.UnitPrice;
                        command.Parameters.Add("@discount", SqlDbType.Decimal).Value = line.DiscountPercent;
                        command.Parameters.Add("@total", SqlDbType.Decimal).Value = line.LineTotal;
                        command.ExecuteNonQuery();
                    }
                }

                InsertAudit(connection, transaction, orderId, "Created", order.CreatedBy, order.Channel);
                transaction.Commit();
                return orderId;
            }
        }

        public void UpdateStatus(int orderId, OrderStatus status, string changedBy)
        {
            using (var connection = Open())
            using (var transaction = connection.BeginTransaction())
            {
                using (var command = Command(connection, "UPDATE dbo.Orders SET Status = @status WHERE Id = @id"))
                {
                    command.Transaction = transaction;
                    command.Parameters.Add("@status", SqlDbType.TinyInt).Value = (byte)status;
                    command.Parameters.Add("@id", SqlDbType.Int).Value = orderId;
                    command.ExecuteNonQuery();
                }

                InsertAudit(connection, transaction, orderId, "Status:" + status, changedBy, null);
                transaction.Commit();
            }
        }

        public string NextOrderNumber()
        {
            using (var connection = Open())
            using (var command = Command(connection, "SELECT NEXT VALUE FOR dbo.OrderNumberSequence"))
            {
                var next = Convert.ToInt64(command.ExecuteScalar());
                return "NW-" + next.ToString("D7");
            }
        }

        public Product GetProduct(int productId)
        {
            using (var connection = Open())
            using (var command = Command(connection,
                "SELECT Id, Sku, Name, Unit, ListPrice, IsActive FROM dbo.Products WHERE Id = @id"))
            {
                command.Parameters.Add("@id", SqlDbType.Int).Value = productId;
                using (var reader = command.ExecuteReader())
                {
                    return reader.Read() ? ReadProduct(reader) : null;
                }
            }
        }

        public IList<Product> GetActiveProducts()
        {
            var result = new List<Product>();
            using (var connection = Open())
            using (var command = Command(connection,
                "SELECT Id, Sku, Name, Unit, ListPrice, IsActive FROM dbo.Products WHERE IsActive = 1 ORDER BY Name"))
            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    result.Add(ReadProduct(reader));
                }
            }

            return result;
        }

        public PriceAgreement GetAgreement(int customerId, int productId)
        {
            using (var connection = Open())
            using (var command = Command(connection,
                "SELECT NegotiatedPrice, ExcludeFromVolumeDiscount FROM dbo.PriceAgreements " +
                "WHERE CustomerId = @customerId AND ProductId = @productId AND ValidFrom <= GETDATE() AND (ValidTo IS NULL OR ValidTo >= GETDATE())"))
            {
                command.Parameters.Add("@customerId", SqlDbType.Int).Value = customerId;
                command.Parameters.Add("@productId", SqlDbType.Int).Value = productId;
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read())
                    {
                        return null;
                    }

                    return new PriceAgreement
                    {
                        CustomerId = customerId,
                        ProductId = productId,
                        NegotiatedPrice = reader.GetDecimal(0),
                        ExcludeFromVolumeDiscount = reader.GetBoolean(1)
                    };
                }
            }
        }

        private SqlConnection Open()
        {
            var connection = new SqlConnection(_connectionString);
            connection.Open();
            return connection;
        }

        private static SqlCommand Command(SqlConnection connection, string sql)
        {
            return new SqlCommand(sql, connection) { CommandType = CommandType.Text };
        }

        private static void InsertAudit(SqlConnection connection, SqlTransaction transaction, int orderId, string action, string user, OrderChannel? channel)
        {
            using (var command = Command(connection,
                "INSERT INTO dbo.OrderAudit (OrderId, Action, ChangedBy, Channel, ChangedAt) VALUES (@orderId, @action, @user, @channel, GETUTCDATE())"))
            {
                command.Transaction = transaction;
                command.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                command.Parameters.Add("@action", SqlDbType.NVarChar, 50).Value = action;
                command.Parameters.Add("@user", SqlDbType.NVarChar, 100).Value = user ?? (object)DBNull.Value;
                command.Parameters.Add("@channel", SqlDbType.TinyInt).Value = channel.HasValue ? (object)(byte)channel.Value : DBNull.Value;
                command.ExecuteNonQuery();
            }
        }

        private static Order ReadOrder(SqlDataReader reader)
        {
            return new Order
            {
                Id = reader.GetInt32(0),
                OrderNumber = reader.GetString(1),
                CustomerId = reader.GetInt32(2),
                OrderDate = reader.GetDateTime(3),
                Status = (OrderStatus)reader.GetByte(4),
                Channel = (OrderChannel)reader.GetByte(5),
                DeliveryAddress = reader.GetString(6),
                InvoiceNumber = reader.IsDBNull(7) ? null : reader.GetString(7),
                CreatedBy = reader.GetString(8),
                OrderDiscountPercent = reader.GetDecimal(9),
                Total = reader.GetDecimal(10)
            };
        }

        private static Product ReadProduct(SqlDataReader reader)
        {
            return new Product
            {
                Id = reader.GetInt32(0),
                Sku = reader.GetString(1),
                Name = reader.GetString(2),
                Unit = reader.GetString(3),
                ListPrice = reader.GetDecimal(4),
                IsActive = reader.GetBoolean(5)
            };
        }
    }
}
