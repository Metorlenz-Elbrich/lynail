const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

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

  /* ── Orders ── */
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
  async getOrders() {
    return (await connect()).collection('orders').find().sort({ created_at: -1 }).toArray();
  },
  async updateOrder(num, updates) {
    delete updates._id;
    return (await connect()).collection('orders').updateOne({ num }, { $set: updates });
  },

  /* ── Reviews ── */
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
  async getAllReviews() {
    return (await connect()).collection('reviews').find().sort({ created_at: -1 }).toArray();
  },
  async deleteReview(oid) {
    return (await connect()).collection('reviews').deleteOne({ _id: oid });
  },

  /* ── Contact ── */
  async insertContact(contact) {
    const col = (await connect()).collection('contacts');
    await col.insertOne({ ...contact, created_at: new Date() });
  },

  /* ── Newsletter ── */
  async insertNewsletter(email) {
    const col = (await connect()).collection('newsletter');
    const exists = await col.findOne({ email });
    if (exists) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
    await col.insertOne({ email, created_at: new Date() });
  },

  /* ── Gallery ── */
  async getGallery() {
    return (await connect()).collection('gallery').find().sort({ created_at: -1 }).toArray();
  },
  async insertGalleryItem(item) {
    const col = (await connect()).collection('gallery');
    const row = { ...item, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async getGalleryItem(oid) {
    return (await connect()).collection('gallery').findOne({ _id: oid });
  },
  async updateGalleryItem(oid, updates) {
    delete updates._id;
    return (await connect()).collection('gallery').updateOne({ _id: oid }, { $set: updates });
  },
  async deleteGalleryItem(oid) {
    return (await connect()).collection('gallery').deleteOne({ _id: oid });
  },

  /* ── Gallery Categories ── */
  async getGalleryCategories() {
    return (await connect()).collection('gallery_categories').find().sort({ order: 1 }).toArray();
  },
  async insertGalleryCategory(cat) {
    const col = (await connect()).collection('gallery_categories');
    const count = await col.countDocuments();
    const row = { ...cat, order: count, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async updateGalleryCategory(oid, updates) {
    delete updates._id;
    return (await connect()).collection('gallery_categories').updateOne({ _id: oid }, { $set: updates });
  },
  async deleteGalleryCategory(oid) {
    return (await connect()).collection('gallery_categories').deleteOne({ _id: oid });
  },

  /* ── Images (stockage binaire MongoDB — pas de filesystem) ── */
  async insertImage(buffer, mimetype) {
    const col = (await connect()).collection('images');
    const result = await col.insertOne({ data: buffer, mimetype, created_at: new Date() });
    return result.insertedId;
  },
  async getImage(oid) {
    return (await connect()).collection('images').findOne(
      { _id: oid },
      { projection: { data: 1, mimetype: 1 } }
    );
  },
  async deleteImage(oid) {
    return (await connect()).collection('images').deleteOne({ _id: oid });
  },

  /* ── Videos (GridFS — fichiers > 16 Mo) ── */
  async uploadVideo(buffer, filename, mimetype) {
    const d = await connect();
    const bucket = new GridFSBucket(d, { bucketName: 'videos' });
    const stream = bucket.openUploadStream(filename, { contentType: mimetype });
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(stream.id));
      stream.on('error', reject);
      stream.end(buffer);
    });
  },
  async openVideoDownloadStream(oid, options) {
    const d = await connect();
    const bucket = new GridFSBucket(d, { bucketName: 'videos' });
    return bucket.openDownloadStream(oid, options);
  },
  async getVideoInfo(oid) {
    const d = await connect();
    const bucket = new GridFSBucket(d, { bucketName: 'videos' });
    const files = await bucket.find({ _id: oid }).toArray();
    return files[0] || null;
  },
  async deleteVideo(oid) {
    const d = await connect();
    const bucket = new GridFSBucket(d, { bucketName: 'videos' });
    await bucket.delete(oid);
  },

  /* ── Services ── */
  async getServices() {
    return (await connect()).collection('services').find().sort({ order: 1 }).toArray();
  },
  async insertService(service) {
    const col = (await connect()).collection('services');
    const count = await col.countDocuments();
    const row = { ...service, order: count, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async updateService(oid, updates) {
    delete updates._id;
    return (await connect()).collection('services').updateOne({ _id: oid }, { $set: updates });
  },
  async deleteService(oid) {
    return (await connect()).collection('services').deleteOne({ _id: oid });
  },

  /* ── Tutorials ── */
  async getTutorials() {
    return (await connect()).collection('tutorials').find().sort({ order: 1 }).toArray();
  },
  async insertTutorial(tutorial) {
    const col = (await connect()).collection('tutorials');
    const count = await col.countDocuments();
    const row = { ...tutorial, order: count, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async updateTutorial(oid, updates) {
    delete updates._id;
    return (await connect()).collection('tutorials').updateOne({ _id: oid }, { $set: updates });
  },
  async getTutorial(oid) {
    return (await connect()).collection('tutorials').findOne({ _id: oid });
  },
  async deleteTutorial(oid) {
    return (await connect()).collection('tutorials').deleteOne({ _id: oid });
  },

  /* ── Prestations ── */
  async getPrestations() {
    return (await connect()).collection('prestations').find().sort({ order: 1 }).toArray();
  },
  async insertPrestation(prestation) {
    const col = (await connect()).collection('prestations');
    const count = await col.countDocuments();
    const row = { ...prestation, order: count, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async updatePrestation(oid, updates) {
    delete updates._id;
    return (await connect()).collection('prestations').updateOne({ _id: oid }, { $set: updates });
  },
  async deletePrestation(oid) {
    return (await connect()).collection('prestations').deleteOne({ _id: oid });
  },
};

async function seed(database) {

  /* ── Orders démo ── */
  const orders = database.collection('orders');
  const demos = [
    { num: 'LN-2024-001', name: 'Sophie M.',  service: 'Nail Art Premium (80$ CAD)',     date: { day:20, month:0, year:2024 }, time:'14:00', email:'sophie@example.com',  status:'ready',     status_label:'Prêt à récupérer',        step1:1,step2:1,step3:1,step4:0 },
    { num: 'LN-2024-002', name: 'Camille L.', service: 'Pose Gel (55$ CAD)',              date: { day:22, month:0, year:2024 }, time:'10:30', email:'camille@example.com', status:'preparing', status_label:'En cours de préparation', step1:1,step2:1,step3:0,step4:0 },
    { num: 'LN-2024-003', name: 'Julie R.',   service: 'Extensions Acrylique (90$ CAD)', date: { day:18, month:0, year:2024 }, time:'16:00', email:'julie@example.com',   status:'completed', status_label:'Terminé',                 step1:1,step2:1,step3:1,step4:1 },
  ];
  for (const d of demos) {
    await orders.updateOne({ num: d.num }, { $setOnInsert: { ...d, created_at: new Date('2024-01-15') } }, { upsert: true });
  }

  /* ── Reviews démo ── */
  const reviews = database.collection('reviews');
  if (await reviews.countDocuments() === 0) {
    const now = Date.now();
    await reviews.insertMany([
      { id:1, name:'Sophie M.',  service:'Nail Art Premium',    rating:5, text:"Absolument époustouflant ! Mes ongles sont devenus de vraies œuvres d'art.",       approved:true, created_at: new Date(now - 2*86400000) },
      { id:2, name:'Camille L.', service:'Pose Gel',             rating:5, text:"Ma première pose gel ici et je suis conquise ! Tenue parfaite après 3 semaines.", approved:true, created_at: new Date(now - 5*86400000) },
      { id:3, name:'Julie R.',   service:'Extensions Acrylique', rating:5, text:"Je cherchais des extensions naturelles et c'est exactement ce que j'ai eu.",       approved:true, created_at: new Date(now - 7*86400000) },
      { id:4, name:'Marie T.',   service:'Formation',            rating:5, text:"La formation est très complète et bien expliquée. Merci infiniment !",              approved:true, created_at: new Date(now - 14*86400000) },
      { id:5, name:'Léa D.',     service:'French Manucure',      rating:4, text:"Très satisfaite de ma French manucure. Je recommande à toutes mes amies.",         approved:true, created_at: new Date(now - 21*86400000) },
      { id:6, name:'Emma B.',    service:'Nail Art Floral',      rating:5, text:"Je voulais quelque chose d'unique pour mon mariage. Motifs floraux exquis !",      approved:true, created_at: new Date(now - 30*86400000) },
    ]);
  }

  /* ── Gallery démo ── */
  const gallery = database.collection('gallery');
  if (await gallery.countDocuments() === 0) {
    await gallery.insertMany([
      { title:'Rose Quartz',    category:'gel',       imageUrl:'', gradient:'linear-gradient(135deg,#f8c8e0,#fbe4ef)', created_at: new Date() },
      { title:'Midnight Blue',  category:'nail-art',  imageUrl:'', gradient:'linear-gradient(135deg,#667eea,#764ba2)', created_at: new Date() },
      { title:'Natural Glow',   category:'naturel',   imageUrl:'', gradient:'linear-gradient(135deg,#ffd89b,#19547b)', created_at: new Date() },
      { title:'French Classic', category:'french',    imageUrl:'', gradient:'linear-gradient(135deg,#f8f9fa,#e9ecef)', created_at: new Date() },
      { title:'Holographic',    category:'nail-art',  imageUrl:'', gradient:'linear-gradient(135deg,#c471f5,#fa71cd)', created_at: new Date() },
      { title:'Nude Stiletto',  category:'acrylique', imageUrl:'', gradient:'linear-gradient(135deg,#f7971e,#ffd200)', created_at: new Date() },
      { title:'Cherry Blossom', category:'nail-art',  imageUrl:'', gradient:'linear-gradient(135deg,#ff9a9e,#fad0c4)', created_at: new Date() },
      { title:'Midnight Gel',   category:'gel',       imageUrl:'', gradient:'linear-gradient(135deg,#2c3e50,#3498db)', created_at: new Date() },
      { title:'Gold French',    category:'french',    imageUrl:'', gradient:'linear-gradient(135deg,#f6d365,#fda085)', created_at: new Date() },
      { title:'Nude Acryl',     category:'acrylique', imageUrl:'', gradient:'linear-gradient(135deg,#e0c3fc,#8ec5fc)', created_at: new Date() },
      { title:'Marble Effect',  category:'nail-art',  imageUrl:'', gradient:'linear-gradient(135deg,#e9defa,#fbfcdb)', created_at: new Date() },
      { title:'Baby Pink Gel',  category:'gel',       imageUrl:'', gradient:'linear-gradient(135deg,#fbc2eb,#a6c1ee)', created_at: new Date() },
    ]);
  }

  /* ── Services démo ── */
  const services = database.collection('services');
  if (await services.countDocuments() === 0) {
    await services.insertMany([
      { icon:'💅', title:'Pose Gel',            description:"Manucure gel longue durée, brillance parfaite jusqu'à 3 semaines",                            price:'55$ CAD',  featured:false, order:0, created_at: new Date() },
      { icon:'✨', title:'Nail Art Premium',     description:"Designs personnalisés, strass, dégradés, motifs floraux et géométriques",                    price:'80$ CAD',  featured:true,  order:1, created_at: new Date() },
      { icon:'🔮', title:'Extensions Acrylique', description:"Allongement naturel ou spectaculaire, forme au choix",                                       price:'90$ CAD',  featured:false, order:2, created_at: new Date() },
      { icon:'🌸', title:'Soin Naturel',          description:"Lime, repousse cuticules, massage, vernis classique ou semi-permanent",                      price:'40$ CAD',  featured:false, order:3, created_at: new Date() },
      { icon:'💅', title:'French Manucure',       description:"French classique, inversée, colorée — toujours élégante",                                   price:'60$ CAD',  featured:false, order:4, created_at: new Date() },
      { icon:'🎓', title:'Formation',             description:"Apprenez les techniques professionnelles en cours particuliers ou en groupe",                price:'120$ CAD', featured:false, order:5, created_at: new Date() },
    ]);
  }

  /* ── Tutorials démo ── */
  const tutorials = database.collection('tutorials');
  if (await tutorials.countDocuments() === 0) {
    await tutorials.insertMany([
      { title:'Les bases de la pose gel',     shortDesc:"Préparation, application, séchage UV — tout ce qu'il faut savoir pour débuter",    description:"Apprenez les fondamentaux de la manucure gel : préparation de l'ongle, application base, couleur et top coat, séchage sous lampe UV/LED.", level:'Débutant',       duration:'12 min', videoUrl:'', views:'2.4k', rating:'4.9', order:0, created_at: new Date() },
      { title:'Nail Art Floral Step by Step', shortDesc:"Créez de magnifiques motifs floraux avec des outils simples",                      description:"Création de motifs floraux détaillés avec dotting tools, pinceaux fins et stamping. Idéal pour les occasions spéciales.",                  level:'Intermédiaire', duration:'24 min', videoUrl:'', views:'3.1k', rating:'4.8', order:1, created_at: new Date() },
      { title:'Extensions acrylique pro',     shortDesc:"Techniques de sculptage, gestion des formes et finitions parfaites",               description:"Maîtrisez la pose d'extensions en acrylique : préparation du lit unguéal, sculptage, formes coffin/stiletto/ballerine.",                  level:'Avancé',        duration:'38 min', videoUrl:'', views:'1.8k', rating:'4.7', order:2, created_at: new Date() },
      { title:'Dégradé & Ombré Nails',        shortDesc:"Maîtrisez l'art du dégradé en 5 techniques différentes",                          description:"Cinq techniques pour réaliser des dégradés parfaits : éponge, pinceau fan, dégradé gel en biberon, airbrush simulation.",                level:'Intermédiaire', duration:'19 min', videoUrl:'', views:'4.2k', rating:'5.0', order:3, created_at: new Date() },
    ]);
  }

  /* ── Prestations démo ── */
  const prestations = database.collection('prestations');
  if (await prestations.countDocuments() === 0) {
    await prestations.insertMany([
      { icon:'💅', name:'Pose Gel',            price:'55$ CAD',  order:0, created_at: new Date() },
      { icon:'✨', name:'Nail Art Premium',     price:'80$ CAD',  order:1, created_at: new Date() },
      { icon:'🔮', name:'Extensions Acrylique', price:'90$ CAD',  order:2, created_at: new Date() },
      { icon:'🌸', name:'Soin Naturel',          price:'40$ CAD',  order:3, created_at: new Date() },
      { icon:'💅', name:'French Manucure',       price:'60$ CAD',  order:4, created_at: new Date() },
      { icon:'🎓', name:'Formation',             price:'120$ CAD', order:5, created_at: new Date() },
    ]);
  }

  /* ── Gallery categories ── */
  const galCats = database.collection('gallery_categories');
  if (await galCats.countDocuments() === 0) {
    await galCats.insertMany([
      { slug:'gel',       label:'Pose Gel',   gradient:'linear-gradient(135deg,#fbc2eb,#a6c1ee)', order:0, created_at: new Date() },
      { slug:'nail-art',  label:'Nail Art',   gradient:'linear-gradient(135deg,#c471f5,#fa71cd)', order:1, created_at: new Date() },
      { slug:'acrylique', label:'Acrylique',  gradient:'linear-gradient(135deg,#f7971e,#ffd200)', order:2, created_at: new Date() },
      { slug:'naturel',   label:'Naturel',    gradient:'linear-gradient(135deg,#d4fc79,#96e6a1)', order:3, created_at: new Date() },
      { slug:'french',    label:'French',     gradient:'linear-gradient(135deg,#f8f9fa,#e9ecef)', order:4, created_at: new Date() },
    ]);
  }
}

module.exports = db;
