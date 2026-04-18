const { MongoClient } = require('mongodb');

const uri    = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let   _db    = null;

async function connect() {
  if (_db) return _db;
  await client.connect();
  _db = client.db('lydhas_nails');
  await seed(_db);
  console.log('[DB] Connecté à MongoDB Atlas');
  return _db;
}

const db = {
  async insertOrder(order) {
    const col = (await connect()).collection('orders');
    const exists = await col.findOne({ num: order.num });
    if (exists) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
    const row = { ...order, status: 'confirmed', status_label: 'Confirmé',
      step1: 1, step2: 0, step3: 0, step4: 0, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async getOrder(num) {
    return (await connect()).collection('orders').findOne({ num });
  },
  async getReviews() {
    return (await connect()).collection('reviews')
      .find({ approved: true }).sort({ created_at: -1 }).toArray();
  },
  async insertReview(review) {
    const col = (await connect()).collection('reviews');
    const count = await col.countDocuments();
    const row = { id: count + 1, ...review, approved: true, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async insertContact(contact) {
    const col = (await connect()).collection('contacts');
    await col.insertOne({ ...contact, created_at: new Date() });
  },
  async insertNewsletter(email) {
    const col = (await connect()).collection('newsletter');
    const exists = await col.findOne({ email });
    if (exists) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
    await col.insertOne({ email, created_at: new Date() });
  }
};

async function seed(database) {
  const orders = database.collection('orders');
  const demos = [
    { num: 'LN-2024-001', name: 'Sophie M.',  service: 'Nail Art Premium (80$ CAD)',     date: { day:20, month:0, year:2024 }, time:'14:00', email:'sophie@example.com',  status:'ready',      status_label:'Prêt à récupérer',           step1:1,step2:1,step3:1,step4:0 },
    { num: 'LN-2024-002', name: 'Camille L.', service: 'Pose Gel (55$ CAD)',              date: { day:22, month:0, year:2024 }, time:'10:30', email:'camille@example.com', status:'preparing',  status_label:'En cours de préparation',    step1:1,step2:1,step3:0,step4:0 },
    { num: 'LN-2024-003', name: 'Julie R.',   service: 'Extensions Acrylique (90$ CAD)', date: { day:18, month:0, year:2024 }, time:'16:00', email:'julie@example.com',   status:'completed',  status_label:'Terminé',                    step1:1,step2:1,step3:1,step4:1 },
  ];
  for (const d of demos) {
    await orders.updateOne({ num: d.num }, { $setOnInsert: { ...d, created_at: new Date('2024-01-15') } }, { upsert: true });
  }

  const reviews = database.collection('reviews');
  const count = await reviews.countDocuments();
  if (count === 0) {
    const now = Date.now();
    const defaults = [
      { name:'Sophie M.',  service:'Nail Art Premium',    rating:5, daysAgo:2,  text:"Absolument époustouflant ! Mes ongles sont devenus de vraies œuvres d'art." },
      { name:'Camille L.', service:'Pose Gel',             rating:5, daysAgo:5,  text:"Ma première pose gel ici et je suis conquise ! Tenue parfaite après 3 semaines." },
      { name:'Julie R.',   service:'Extensions Acrylique', rating:5, daysAgo:7,  text:"Je cherchais des extensions naturelles et c'est exactement ce que j'ai eu." },
      { name:'Marie T.',   service:'Formation',            rating:5, daysAgo:14, text:"La formation est très complète et bien expliquée. Merci infiniment !" },
      { name:'Léa D.',     service:'French Manucure',      rating:4, daysAgo:21, text:"Très satisfaite de ma French manucure. Je recommande à toutes mes amies." },
      { name:'Emma B.',    service:'Nail Art Floral',      rating:5, daysAgo:30, text:"Je voulais quelque chose d'unique pour mon mariage. Motifs floraux exquis !" },
    ];
    await reviews.insertMany(defaults.map((r, i) => ({
      id: i + 1, name: r.name, service: r.service, rating: r.rating,
      text: r.text, approved: true, created_at: new Date(now - r.daysAgo * 86400000)
    })));
  }
}

module.exports = db;