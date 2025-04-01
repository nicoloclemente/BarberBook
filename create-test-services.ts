/**
 * Script per creare servizi di default per l'applicazione Barber Shop
 */
import { db } from './server/db';
import { services } from './shared/schema';

async function createTestServices() {
  console.log('Creazione servizi di default...');

  try {
    // Inserisci servizi di default
    await db.insert(services).values([
      {
        name: "Taglio Capelli",
        description: "Taglio classico con forbici e rifinitura con rasoio.",
        price: 2000, // €20.00
        duration: 30, // 30 minutes
        imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      },
      {
        name: "Barba Completa",
        description: "Rasatura completa con trattamento pre e post-barba.",
        price: 1500, // €15.00
        duration: 20, // 20 minutes
        imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      },
      {
        name: "Taglio + Barba",
        description: "Servizio completo di taglio capelli e sistemazione barba.",
        price: 3500, // €35.00
        duration: 45, // 45 minutes
        imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      },
      {
        name: "Shampoo + Taglio",
        description: "Shampoo professionale e taglio personalizzato.",
        price: 2500, // €25.00
        duration: 35, // 35 minutes
        imageUrl: "https://images.unsplash.com/photo-1634302066072-dcdb3244782c?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      },
      {
        name: "Trattamento Viso",
        description: "Pulizia e idratazione del viso con prodotti premium.",
        price: 3000, // €30.00
        duration: 40, // 40 minutes
        imageUrl: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      },
      {
        name: "Rasatura Tradizionale",
        description: "Rasatura tradizionale con panno caldo e prodotti di lusso.",
        price: 2000, // €20.00
        duration: 25, // 25 minutes
        imageUrl: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=500&q=60",
        isGeneric: true,
      }
    ]);

    console.log('✅ Servizi di default creati con successo');

  } catch (error) {
    console.error('❌ Errore durante la creazione dei servizi di default:', error);
  }
}

createTestServices()
  .then(() => {
    console.log('✨ Completato!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Errore:', err);
    process.exit(1);
  });