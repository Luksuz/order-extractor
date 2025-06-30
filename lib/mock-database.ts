// Mock Database for RxOffice Order Creator
// Simplified to focus only on order management

interface OrderInfo {
  Id: number
  ErpId: string
  Status: string
  CreatedDate: string
  ModifiedDate: string
  CustomerName: string
  OrderId: string
  VcaData: string
  ShopNumber?: string
  Notes?: string
}

class MockDatabase {
  private orders: OrderInfo[] = []
  private nextOrderId = 1

  constructor() {
    this.initializeOrders()
  }

  private initializeOrders() {
    // Sample orders for testing
    this.orders = [
      {
        Id: 1,
        ErpId: "ERP001",
        Status: "Order Received",
        CreatedDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ModifiedDate: new Date(Date.now() - 86400000).toISOString(),
        CustomerName: "John Doe",
        OrderId: "ORD001",
        VcaData: "DO=B\nCLIENT=John Doe\nSPH=-2.25;-2.00\nCYL=-0.50;-0.25\nAX=45;180",
        ShopNumber: "SHOP001"
      },
      {
        Id: 2,
        ErpId: "ERP002", 
        Status: "In Production",
        CreatedDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        ModifiedDate: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        CustomerName: "Jane Smith",
        OrderId: "ORD002",
        VcaData: "DO=B\nCLIENT=Jane Smith\nSPH=-1.75;-1.50\nCYL=-0.25;-0.50\nADD=1.75;1.75",
        ShopNumber: "SHOP001"
      },
      {
        Id: 3,
        ErpId: "ERP003",
        Status: "Shipped", 
        CreatedDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        ModifiedDate: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        CustomerName: "Mike Johnson",
        OrderId: "ORD003",
        VcaData: "DO=B\nCLIENT=Mike Johnson\nSPH=-3.00;-2.75\nIPD=32.0;32.0",
        ShopNumber: "SHOP002"
      }
    ]
    
    this.nextOrderId = Math.max(...this.orders.map(o => o.Id)) + 1
  }

  // Authentication simulation
  authenticate(userName: string, password: string): boolean {
    return userName === "380" && password === "ZOHO123"
  }

  // Create Order
  createOrder(vca: string): { Status: number; Message: string; Data?: any } {
    try {
      const orderData = this.parseVcaString(vca)
      
      if (!orderData.CLIENT) {
        return { Status: 1, Message: "Customer name is required" }
      }

      const newOrder: OrderInfo = {
        Id: this.nextOrderId++,
        ErpId: `ERP${String(this.nextOrderId - 1).padStart(3, '0')}`,
        Status: "Order Received",
        CreatedDate: new Date().toISOString(),
        ModifiedDate: new Date().toISOString(),
        CustomerName: orderData.CLIENT,
        OrderId: orderData.JOB || `ORD${String(this.nextOrderId - 1).padStart(3, '0')}`,
        VcaData: vca,
        ShopNumber: orderData.SHOPNUMBER || undefined,
        Notes: undefined
      }

      this.orders.push(newOrder)

      return {
        Status: 0,
        Message: "Order created successfully",
        Data: {
          OrderId: newOrder.Id,
          ErpId: newOrder.ErpId,
          Status: newOrder.Status
        }
      }
    } catch (error) {
      return { 
        Status: 1, 
        Message: `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  // Get all orders
  getAllOrders(): { Status: number; Message: string; Data?: OrderInfo[] } {
    return {
      Status: 0,
      Message: "Orders retrieved successfully",
      Data: [...this.orders].sort((a, b) => 
        new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime()
      )
    }
  }

  // Get order by ID
  getOrderById(orderId: number): { Status: number; Message: string; Data?: OrderInfo } {
    const order = this.orders.find(o => o.Id === orderId)
    
    if (!order) {
      return { Status: 1, Message: "Order not found" }
    }

    return {
      Status: 0,
      Message: "Order retrieved successfully", 
      Data: order
    }
  }

  // Cancel order
  cancelOrder(orderId: number): { Status: number; Message: string; Data?: any } {
    const orderIndex = this.orders.findIndex(o => o.Id === orderId)
    
    if (orderIndex === -1) {
      return { Status: 1, Message: "Order not found" }
    }

    if (this.orders[orderIndex].Status === "Shipped") {
      return { Status: 1, Message: "Cannot cancel shipped order" }
    }

    this.orders[orderIndex].Status = "Cancelled"
    this.orders[orderIndex].ModifiedDate = new Date().toISOString()

    return {
      Status: 0,
      Message: "Order cancelled successfully",
      Data: {
        OrderId: this.orders[orderIndex].Id,
        Status: this.orders[orderIndex].Status
      }
    }
  }

  // Update order status
  updateOrderStatus(orderId: number, status: string): { Status: number; Message: string; Data?: any } {
    const orderIndex = this.orders.findIndex(o => o.Id === orderId)
    
    if (orderIndex === -1) {
      return { Status: 1, Message: "Order not found" }
    }

    const validStatuses = ["Order Received", "In Production", "Shipped", "Cancelled"]
    if (!validStatuses.includes(status)) {
      return { Status: 1, Message: "Invalid status" }
    }

    this.orders[orderIndex].Status = status
    this.orders[orderIndex].ModifiedDate = new Date().toISOString()

    return {
      Status: 0,
      Message: "Order status updated successfully",
      Data: {
        OrderId: this.orders[orderIndex].Id,
        Status: this.orders[orderIndex].Status
      }
    }
  }

  // Parse VCA string into object
  parseVcaString(vca: string): any {
    const result: any = {}
    const lines = vca.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        const value = valueParts.join('=').trim()
        if (key && value) {
          result[key.trim()] = value
        }
      }
    }
    
    return result
  }

  // Convert order data to VCA string
  vcaDataToString(orderData: any): string {
    const vcaLines: string[] = []
    
    Object.entries(orderData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        vcaLines.push(`${key}=${value}`)
      }
    })
    
    return vcaLines.join('\n')
  }

  // Get database statistics
  getStats(): { Status: number; Message: string; Data?: any } {
    const statusCounts = this.orders.reduce((acc, order) => {
      acc[order.Status] = (acc[order.Status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      Status: 0,
      Message: "Statistics retrieved successfully",
      Data: {
        totalOrders: this.orders.length,
        statusBreakdown: statusCounts,
        recentOrders: this.orders
          .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime())
          .slice(0, 5)
          .map(o => ({ 
            id: o.Id, 
            customer: o.CustomerName, 
            status: o.Status, 
            created: o.CreatedDate 
          }))
      }
    }
  }
}

// Export singleton instance
export const mockDatabase = new MockDatabase() 