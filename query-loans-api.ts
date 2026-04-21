import { ethers } from 'ethers';

/**
 * Script para obtener los loans del backend API y extraer el Escrow ID
 *
 * El backend guarda los loans en memoria/DB con el escrow_id
 * Este script consulta la API para encontrar loans asociados a un worker
 *
 * Uso:
 * npx tsx query-loans-api.ts
 */

const API_BASE_URL = 'https://lendi-backend.vercel.app/api';
const WORKER_ADDRESS = '0xeD6fE6008D6bbCe64dCCAFBb3E03919ba684F83D';

async function queryLoansAPI() {
  console.log('\n🔍 Querying Lendi Backend API for Loans\n');
  console.log('═'.repeat(80));

  console.log(`\n📍 API Base URL: ${API_BASE_URL}`);
  console.log(`   Worker Address: ${WORKER_ADDRESS}`);

  // Try to get all loans from API
  console.log('\n1️⃣  Fetching loans from API...');

  try {
    const response = await fetch(`${API_BASE_URL}/v1/loans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This endpoint might require auth, may need to add Authorization header
      },
    });

    if (!response.ok) {
      console.log(`   ❌ API returned status ${response.status}: ${response.statusText}`);

      if (response.status === 401 || response.status === 403) {
        console.log('\n   ⚠️  Authentication required. The /v1/loans endpoint requires auth.');
        console.log('   The escrow data is stored in the backend memory/DB.');
        console.log('\n   Options:');
        console.log('   1. Use the frontend to view loans (https://lendi-origin.vercel.app)');
        console.log('   2. Check browser DevTools Network tab when viewing loans');
        console.log('   3. Look for escrow_id in the API response');
        return;
      }

      const errorText = await response.text();
      console.log(`   Response: ${errorText}`);
      return;
    }

    const loans = await response.json();
    console.log(`   ✅ Fetched ${Array.isArray(loans) ? loans.length : 'unknown'} loans`);

    if (!Array.isArray(loans)) {
      console.log('\n   ⚠️  Unexpected response format');
      console.log(`   Response: ${JSON.stringify(loans, null, 2)}`);
      return;
    }

    if (loans.length === 0) {
      console.log('\n   ❌ No loans found in backend storage');
      console.log('   This could mean:');
      console.log('   - Backend was restarted (using in-memory storage)');
      console.log('   - No loans have been created yet');
      console.log('   - Different backend deployment than used by frontend');
      return;
    }

    console.log('\n2️⃣  Analyzing loans...\n');

    let foundWorkerLoans = 0;

    for (const loan of loans) {
      console.log(`\n📦 Loan ID: ${loan.id}`);
      console.log('─'.repeat(80));
      console.log(`   Worker ID:     ${loan.worker_id}`);
      console.log(`   Lender ID:     ${loan.lender_id}`);
      console.log(`   Escrow ID:     ${loan.escrow_id || '(none)'}`);
      console.log(`   Status:        ${loan.status}`);
      console.log(`   Created At:    ${loan.created_at}`);
      console.log(`   Updated At:    ${loan.updated_at}`);

      // Check if this loan is for our worker (by address match in worker_id)
      if (loan.worker_id && typeof loan.worker_id === 'string') {
        // worker_id might be the wallet address or a user ID
        if (loan.worker_id.toLowerCase().includes(WORKER_ADDRESS.toLowerCase())) {
          foundWorkerLoans++;
          console.log(`\n   ✅ This loan is for the worker address ${WORKER_ADDRESS}`);

          if (loan.escrow_id) {
            console.log(`\n   🎯 ESCROW ID FOUND: ${loan.escrow_id}`);
            console.log(`\n   To debug this escrow, run:`);
            console.log(`   ESCROW_ID=${loan.escrow_id} npx tsx debug-escrow-state.ts`);
          } else {
            console.log(`\n   ⚠️  No escrow_id stored for this loan`);
          }
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`✅ Query complete! Found ${foundWorkerLoans} loans for worker ${WORKER_ADDRESS}\n`);

    if (foundWorkerLoans === 0) {
      console.log('💡 Note: worker_id in the backend might be a user ID, not the wallet address.');
      console.log('   All loans are listed above. Check if any match your expected data.\n');
    }

  } catch (error: any) {
    console.error(`\n❌ Error fetching from API: ${error.message}`);
    if (error.code === 'ENOTFOUND') {
      console.error('   Could not reach the backend API. Check your internet connection.');
    }
  }
}

// Run
queryLoansAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
