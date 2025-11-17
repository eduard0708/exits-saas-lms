import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
// Register Ionicons used across the app early to avoid runtime warnings on web
import './app/icons';

import { Capacitor } from '@capacitor/core';

// Initialize jeep-sqlite for web before bootstrapping
(async () => {
  try {
    // Only initialize jeep-sqlite on web platform
    if (Capacitor.getPlatform() === 'web') {
      console.log('🔧 Waiting for jeep-sqlite to load...');
      
      // Wait for jeep-sqlite custom element to be defined (loaded from CDN in index.html)
      await customElements.whenDefined('jeep-sqlite');
      console.log('✅ jeep-sqlite custom element registered');
      
      // Create and append the jeep-sqlite element to the DOM
      const jeepEl = document.createElement('jeep-sqlite');
      jeepEl.setAttribute('autoSave', 'true');
      document.body.appendChild(jeepEl);
      
      console.log('✅ jeep-sqlite element added to DOM');
      
      // Give it a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      console.log('📱 Running on native platform - jeep-sqlite not needed');
    }
  } catch (err) {
    console.error('⚠️ jeep-sqlite initialization warning:', err);
  }
})();

// Bootstrap Angular app immediately (not inside async function to preserve injection context)
bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('✅ Angular application bootstrapped successfully'))
  .catch(err => console.error('❌ Error starting app:', err));
