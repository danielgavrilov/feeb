import { LanguageCode, TranslationDictionary } from "./config";

const baseTranslations: Record<LanguageCode, TranslationDictionary> = {
  en: {
    common: {
      language: {
        label: "Language",
        names: {
          en: "English",
          nl: "Dutch",
        },
      },
      restaurant: {
        fallback: "No Restaurant",
      },
      actions: {
        reviewLatest: "Click to open the most recent dish awaiting review",
        explore: "Explore",
        dismiss: "Dismiss",
      },
    },
    navigation: {
      landing: "Home",
      add: "Ingredients",
      recipes: "Recipe Book",
      menu: "Menu",
      settings: "Settings",
    },
    settings: {
      language: {
        title: "Interface language",
        description: "Choose the language used throughout the app.",
      },
      account: {
        title: "User Account",
        emailLabel: "Email",
        signOut: "Sign Out",
      },
    },
    landing: {
      heroLive: "You’re live!",
      heroGettingLive: "Let’s get you live",
      greeting: ({ name }: { name: string }) => `Welcome back, ${name} 🌟`,
      quickWins: "Keep the momentum going with these quick wins for your team.",
      quickActionsTitle: "Quick actions",
      quickActionsSubtitle: "Focus on one task at a time",
      quickActions: {
        uploadMenu: {
          label: "Upload Menu",
          description: "Use AI to capture your menu instantly",
        },
        addDish: {
          label: "Add Dish",
          description: "Capture a new recipe in minutes",
        },
        recipeBook: {
          label: "Recipe Book",
          description: "Review everything your team has added",
        },
        uploadPhotos: {
          label: "Upload Photos",
          description: "Showcase dishes with beautiful imagery",
        },
        customiseMenu: {
          label: "Customise Menu",
          description: "Match your brand colours and logo",
        },
        support: {
          label: "Support",
          description: "Chat with us if you need a hand",
        },
        pricing: {
          label: "Pricing Insights",
          description: "See profitability suggestions",
        },
      },
      reviewStatus: {
        pending: ({ count }: { count: number }) =>
          `${count} ${count === 1 ? "menu item" : "menu items"} still need confirmation`,
        complete: "All menu items have been confirmed.",
      },
      upsellTitle: "Want to boost your profits?",
      upsellDescription: "Try Pricing Insights to spot margin opportunities without the guesswork.",
      upsellAction: "Explore",
      upsellDismiss: "Dismiss",
      progressSummary: ({ completed, total }: { completed: number; total: number }) =>
        `${completed}/${total} steps complete`,
      progressSteps: {
        upload: "Upload menu",
        confirm: "Confirm ingredients",
        addToMenu: "Add reviewed dishes to menu",
        customise: "Customise menu",
        live: "Set menu live",
      },
    },
    nextStep: {
      createProfile: {
        title: "Create your restaurant profile",
        description: "Add your restaurant details so we can tailor your setup journey.",
        actionLabel: "Create Restaurant",
      },
      uploadMenu: {
        title: "Let’s get your menu live!",
        description: "Upload your menu to start creating your digital recipe book.",
        actionLabel: "Upload Menu",
      },
      reviewRecipes: {
        title: "Next step: review your recipes.",
        description:
          "Confirm the ingredients for each of the meals you have uploaded to make sure we get the allergens right.",
        actionLabel: "Review recipe",
      },
      addToMenu: {
        title: "Add your reviewed dishes to the menu",
        description: "Move confirmed recipes into your live menu so they’re ready for guests.",
        actionLabel: "Open recipe book",
      },
      customiseMenu: {
        title: "Customise your menu page",
        description: "Add your logo and colour scheme from the settings tab.",
        actionLabel: "Open settings",
      },
      setLive: {
        title: "Set your menu live",
        description: "Review the live status page to see how publishing will work once it’s available.",
        actionLabel: "View live status",
      },
    },
    progressTracker: {
      title: "Setup progress",
      helpButton: "Replay the app tour",
    },
    tour: {
      next: "Next",
      previous: "Previous",
      done: "Done",
      progress: "{{current}} of {{total}}",
      step1: {
        title: "Welcome to Feeb! 👋",
        description: "Feeb helps restaurants to easily create a user-friendly allergen menu. Mapping allergens can be a hassle, so our AI helps to make the process as smooth as possible.",
      },
      step2: {
        title: "Start here",
        description: "Upload your menu and we pre-fill most of the ingredients and allergens using AI.",
      },
      step3: {
        title: "Review ingredients",
        description: "However, AI can make mistakes, and we do not know your exact recipes. Review your ingredient lists here.",
      },
      step4: {
        title: "Review ingredients",
        description: "This is where you can double-check the pre-filled ingredients. and quantities by confirming each recipe on your menu. This is the most time-consuming step, but it is necessary to ensure you inform your customers correctly.",
      },
      step5: {
        title: "Recipe Book",
        description: "All of your recipes are listed here.",
      },
      step6: {
        title: "Recipe Book",
        description: "You can change the sections names, the order of the dishes on the menu and you can put dishes 'Live' so that they appear on your actual menu.",
      },
      step7: {
        title: "Your live menu",
        description: "This is how customers will see your menu.",
      },
      step8: {
        title: "User-friendly filters",
        description: "Using the drop-down will make it easier for customers to order, and reduce the number of questions and special requests for your staff.",
      },
      step9: {
        title: "Need help?",
        description: "Click this button anytime to replay this tour and see the main features again.",
      },
    },
    auth: {
      login: {
        title: "Welcome back",
        subtitle: "Sign in to your Feeb account",
        continueWithGoogle: "Continue with Google",
        divider: "Or continue with email",
        emailLabel: "Email",
        passwordLabel: "Password",
        forgotPassword: "Forgot password?",
        submitting: "Signing in...",
        submit: "Sign in",
        noAccount: "Don't have an account?",
        signupLink: "Sign up",
      },
      signup: {
        title: "Create an account",
        subtitle: "Get started with Feeb today",
        continueWithGoogle: "Continue with Google",
        divider: "Or continue with email",
        emailLabel: "Email",
        passwordLabel: "Password",
        confirmPasswordLabel: "Confirm Password",
        submitting: "Creating account...",
        submit: "Create account",
        hasAccount: "Already have an account?",
        signinLink: "Sign in",
      },
      forgotPassword: {
        title: "Reset your password",
        subtitle: "Enter your email to receive reset instructions",
        emailLabel: "Email",
        submit: "Send reset link",
        submitting: "Sending...",
        success: "Check your email for reset instructions",
        backToLogin: "Back to login",
      },
      resetPassword: {
        title: "Set new password",
        subtitle: "Enter your new password",
        passwordLabel: "New password",
        confirmPasswordLabel: "Confirm new password",
        submit: "Reset password",
        submitting: "Resetting...",
        success: "Password updated successfully",
      },
    },
    validation: {
      email: "Please enter a valid email address",
      passwordLength: "Password must be at least 6 characters",
      passwordsMismatch: "Passwords don't match",
    },
    notFound: {
      message: "Oops! Page not found",
      cta: "Return to Home",
    },
    index: {
      reviewHelper: "Click to open the most recent dish awaiting review",
    },
  },
  nl: {
    common: {
      language: {
        label: "Taal",
        names: {
          en: "Engels",
          nl: "Nederlands",
        },
      },
      restaurant: {
        fallback: "Geen restaurant",
      },
      actions: {
        reviewLatest: "Klik om het meest recente gerecht te openen dat op bevestiging wacht",
        explore: "Ontdekken",
        dismiss: "Sluiten",
      },
    },
    navigation: {
      landing: "Overzicht",
      add: "Ingrediënten",
      recipes: "Receptenboek",
      menu: "Menu",
      settings: "Instellingen",
    },
    settings: {
      language: {
        title: "Interfacetaal",
        description: "Kies de taal die in de app wordt gebruikt.",
      },
      account: {
        title: "Gebruikersaccount",
        emailLabel: "E-mail",
        signOut: "Uitloggen",
      },
    },
    landing: {
      heroLive: "Je bent live!",
      heroGettingLive: "Laten we je live krijgen",
      greeting: ({ name }: { name: string }) => `Welkom terug, ${name} 🌟`,
      quickWins: "Houd het tempo erin met deze snelle successen voor je team.",
      quickActionsTitle: "Snelle acties",
      quickActionsSubtitle: "Richt je op één taak tegelijk",
      quickActions: {
        uploadMenu: {
          label: "Menu uploaden",
          description: "Gebruik AI om je menu direct vast te leggen",
        },
        addDish: {
          label: "Gerecht toevoegen",
          description: "Leg in enkele minuten een nieuw recept vast",
        },
        recipeBook: {
          label: "Receptenboek",
          description: "Bekijk alles wat je team heeft toegevoegd",
        },
        uploadPhotos: {
          label: "Foto's uploaden",
          description: "Laat gerechten zien met mooie beelden",
        },
        customiseMenu: {
          label: "Menu aanpassen",
          description: "Stem af op je merkkleuren en logo",
        },
        support: {
          label: "Ondersteuning",
          description: "Chat met ons als je hulp nodig hebt",
        },
        pricing: {
          label: "Prijsinzichten",
          description: "Bekijk aanbevelingen voor winstgevendheid",
        },
      },
      reviewStatus: {
        pending: ({ count }: { count: number }) =>
          `${count} ${count === 1 ? "gerecht" : "gerechten"} moeten nog bevestigd worden`,
        complete: "Alle gerechten zijn bevestigd.",
      },
      upsellTitle: "Wil je je winst verhogen?",
      upsellDescription: "Probeer Prijsinzichten om marges te ontdekken zonder giswerk.",
      upsellAction: "Ontdekken",
      upsellDismiss: "Sluiten",
      progressSummary: ({ completed, total }: { completed: number; total: number }) =>
        `${completed}/${total} stappen voltooid`,
      progressSteps: {
        upload: "Menu uploaden",
        confirm: "Ingrediënten bevestigen",
        addToMenu: "Goedgekeurde gerechten op menu zetten",
        customise: "Menu aanpassen",
        live: "Menu live zetten",
      },
    },
    nextStep: {
      createProfile: {
        title: "Maak je restaurantprofiel",
        description: "Vul je restaurantgegevens in zodat we de setup kunnen afstemmen.",
        actionLabel: "Restaurant maken",
      },
      uploadMenu: {
        title: "Laten we je menu live zetten!",
        description: "Upload je menu om je digitale receptenboek te vullen.",
        actionLabel: "Menu uploaden",
      },
      reviewRecipes: {
        title: "Laten we je recepten nalopen.",
        description:
          "Bevestig de ingrediënten van elke maaltijd die je hebt geüpload zodat de allergenen kloppen.",
        actionLabel: "Recept beoordelen",
      },
      addToMenu: {
        title: "Zet je beoordeelde gerechten op het menu",
        description: "Verplaats bevestigde recepten naar je live menu zodat gasten ze kunnen bekijken.",
        actionLabel: "Receptenboek openen",
      },
      customiseMenu: {
        title: "Pas je menupagina aan",
        description: "Voeg je logo en kleurenschema toe via het tabblad instellingen.",
        actionLabel: "Naar instellingen",
      },
      setLive: {
        title: "Zet je menu live",
        description: "Bekijk de live-statuspagina om te zien hoe publiceren straks werkt.",
        actionLabel: "Live-status bekijken",
      },
    },
    progressTracker: {
      title: "Voortgang van de setup",
      helpButton: "Speel de app-tour opnieuw af",
    },
    tour: {
      next: "Volgende",
      previous: "Vorige",
      done: "Klaar",
      progress: "{{current}} van {{total}}",
      step1: {
        title: "Welkom bij Feeb! 👋",
        description: "Feeb helpt restaurants om eenvoudig een gebruiksvriendelijk allergenen menu te maken. Het in kaart brengen van allergenen kan lastig zijn, dus onze AI helpt om het proces zo soepel mogelijk te maken.",
      },
      step2: {
        title: "Begin hier",
        description: "Upload je menu en wij vullen de meeste ingrediënten en allergenen vooraf in met AI.",
      },
      step3: {
        title: "Bekijk ingrediënten",
        description: "AI kan echter fouten maken, en wij kennen je exacte recepten niet. Bekijk hier je ingrediëntenlijsten.",
      },
      step4: {
        title: "Bekijk ingrediënten",
        description: "Dit is waar je de vooraf ingevulde ingrediënten en hoeveelheden kunt dubbelchecken door elk recept op je menu te bevestigen. Dit is de meest tijdrovende stap, maar het is noodzakelijk om ervoor te zorgen dat je je klanten correct informeert.",
      },
      step5: {
        title: "Receptenboek",
        description: "Al je recepten staan hier vermeld.",
      },
      step6: {
        title: "Receptenboek",
        description: "Je kunt de sectienamen, de volgorde van de gerechten op het menu wijzigen en gerechten 'Live' zetten zodat ze op je daadwerkelijke menu verschijnen.",
      },
      step7: {
        title: "Je live menu",
        description: "Zo zien klanten je menu.",
      },
      step8: {
        title: "Gebruiksvriendelijke filters",
        description: "Het gebruik van het drop-down menu maakt het gemakkelijker voor klanten om te bestellen, en vermindert het aantal vragen en speciale verzoeken voor je personeel.",
      },
      step9: {
        title: "Hulp nodig?",
        description: "Klik op deze knop om deze tour opnieuw af te spelen en de belangrijkste functies weer te zien.",
      },
    },
    auth: {
      login: {
        title: "Welkom terug",
        subtitle: "Meld je aan bij je Feeb-account",
        continueWithGoogle: "Doorgaan met Google",
        divider: "Of ga verder met e-mail",
        emailLabel: "E-mail",
        passwordLabel: "Wachtwoord",
        forgotPassword: "Wachtwoord vergeten?",
        submitting: "Aan het aanmelden...",
        submit: "Aanmelden",
        noAccount: "Nog geen account?",
        signupLink: "Registreren",
      },
      signup: {
        title: "Account aanmaken",
        subtitle: "Ga vandaag nog aan de slag met Feeb",
        continueWithGoogle: "Doorgaan met Google",
        divider: "Of ga verder met e-mail",
        emailLabel: "E-mail",
        passwordLabel: "Wachtwoord",
        confirmPasswordLabel: "Wachtwoord bevestigen",
        submitting: "Account wordt aangemaakt...",
        submit: "Account aanmaken",
        hasAccount: "Heb je al een account?",
        signinLink: "Aanmelden",
      },
      forgotPassword: {
        title: "Wachtwoord opnieuw instellen",
        subtitle: "Voer je e-mailadres in voor instructies",
        emailLabel: "E-mail",
        submit: "Verstuur resetlink",
        submitting: "Versturen...",
        success: "Controleer je e-mail voor resetinstructies",
        backToLogin: "Terug naar aanmelden",
      },
      resetPassword: {
        title: "Nieuw wachtwoord instellen",
        subtitle: "Voer je nieuwe wachtwoord in",
        passwordLabel: "Nieuw wachtwoord",
        confirmPasswordLabel: "Bevestig nieuw wachtwoord",
        submit: "Wachtwoord resetten",
        submitting: "Resetten...",
        success: "Wachtwoord succesvol bijgewerkt",
      },
    },
    validation: {
      email: "Vul een geldig e-mailadres in",
      passwordLength: "Het wachtwoord moet minstens 6 tekens lang zijn",
      passwordsMismatch: "Wachtwoorden komen niet overeen",
    },
    notFound: {
      message: "Oeps! Pagina niet gevonden",
      cta: "Terug naar home",
    },
    index: {
      reviewHelper: "Klik om het meest recente gerecht te openen dat op bevestiging wacht",
    },
  },
};

export const translations = baseTranslations;
