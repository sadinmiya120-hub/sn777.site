const fs = require('fs');

try {
  const list = JSON.parse(fs.readFileSync('./data/transactions_store.json', 'utf8'));
  const match = list.filter(x => x.id === 'ORD1790554559210' || x.order_no === 'ORD1790554559210');
  console.log('Match for ORD1790554559210:', JSON.stringify(match, null, 2));

  const userStore = JSON.parse(fs.readFileSync('./data/local_users_store.json', 'utf8'));
  console.log('User store:', JSON.stringify(userStore, null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
