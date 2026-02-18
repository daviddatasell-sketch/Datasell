// Test script for Order ID allocation endpoint
console.log('🧪 Testing Order ID Allocation Endpoint\n');

async function testOrderIdAllocation() {
  try {
    // Simulate calling the allocation endpoint 5 times to verify sequential allocation
    console.log('📝 Making 5 test allocation requests...\n');
    
    const orders = [];
    
    for (let i = 1; i <= 5; i++) {
      try {
        const response = await fetch('http://localhost:3000/api/allocate-order-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'  // Include session cookies
        });

        const data = await response.json();
        console.log(`   Request ${i}:`, data);
        
        if (data.success && data.orderId) {
          orders.push(data.orderId);
        } else {
          console.error(`   ❌ Request ${i} failed:`, data);
        }
      } catch (error) {
        console.error(`   ❌ Request ${i} error:`, error.message);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Test Results:');
    console.log('   Allocated Order IDs:', orders);
    
    if (orders.length > 0) {
      const isSequential = orders.every((id, i) => i === 0 || id === orders[i-1] + 1);
      if (isSequential) {
        console.log('   ✅ Order IDs are sequential!');
        console.log(`   📊 Starting from ${orders[0]}, each increments by 1\n`);
      } else {
        console.log('   ⚠️  Order IDs are NOT sequential\n');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run test
testOrderIdAllocation().then(() => {
  console.log('✅ Test complete. You can now make a test purchase to verify Order ID is displayed in the modal.');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
