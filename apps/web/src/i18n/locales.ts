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
        customise: "Customise Menu",
        photos: "Add photos (optional)",
        live: "Set Menu Live",
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
        title: "Let’s review your recipes.",
        description:
          "Confirm the ingredients for each of the meals you have uploaded to make sure we get the allergens right.",
        actionLabel: "Review recipe",
      },
      customiseMenu: {
        title: "Customise your menu page",
        description: "Add your logo and colour scheme to match your restaurant.",
        actionLabel: "Customise",
      },
      uploadPhotos: {
        title: "Add photos of your dishes",
        description: "Make your menu shine with mouth-watering pictures.",
        actionLabel: "Upload Photos",
      },
      carousel: {
        addDishTitle: "Add a new dish",
        addDishAction: "Add Dish",
        printQrTitle: "Print your QR menu",
        printQrAction: "Print QR",
        pricingTitle: "Optimise pricing",
        pricingAction: "Try Pricing Insights",
      },
    },
    progressTracker: {
      title: "Setup progress",
    },
    auth: {
      login: {
        title: "Welcome back",
        subtitle: "Sign in to your Feeb account",
        continueWithGoogle: "Continue with Google",
        divider: "Or continue with email",
        emailLabel: "Email",
        passwordLabel: "Password",
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
        customise: "Menu aanpassen",
        photos: "Foto's toevoegen (optioneel)",
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
      customiseMenu: {
        title: "Pas je menupagina aan",
        description: "Voeg je logo en kleurenschema toe zodat het bij je restaurant past.",
        actionLabel: "Aanpassen",
      },
      uploadPhotos: {
        title: "Voeg foto's van je gerechten toe",
        description: "Laat je menu stralen met watertandende foto's.",
        actionLabel: "Foto's uploaden",
      },
      carousel: {
        addDishTitle: "Voeg een nieuw gerecht toe",
        addDishAction: "Gerecht toevoegen",
        printQrTitle: "Print je QR-menu",
        printQrAction: "QR printen",
        pricingTitle: "Optimaliseer prijzen",
        pricingAction: "Probeer Prijsinzichten",
      },
    },
    progressTracker: {
      title: "Voortgang van de setup",
    },
    auth: {
      login: {
        title: "Welkom terug",
        subtitle: "Meld je aan bij je Feeb-account",
        continueWithGoogle: "Doorgaan met Google",
        divider: "Of ga verder met e-mail",
        emailLabel: "E-mail",
        passwordLabel: "Wachtwoord",
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
