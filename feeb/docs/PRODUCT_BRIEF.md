# Product Brief: Feeb (Plate Plan Portal)

## 1. Project Overview

Feeb is a chef-facing recipe management tool that helps culinary teams document ingredients and present customers with dietary restrictions a dedicated, filterable menu. The platform consists of two main components:

- **Recipe Upload Backend**: Tablet/phone-optimized interface for chefs to quickly input recipes with ingredients and quantities
- **Customer Menu Frontend**: Filterable menu allowing customers to view dishes compatible with their dietary restrictions

The system automatically labels allergens and provides immediate visual feedback about which dishes are safe for specific dietary needs.

## 2. Target Audience

### Primary Users (Chefs & Kitchen Staff)
- Culinary professionals who need to quickly document recipes in busy kitchen environments
- Restaurant teams managing menus for customers with dietary restrictions
- Chefs working with diverse cuisines (initial pilot: Middle Eastern cuisine)

### Secondary Users (Restaurant Customers)
- Diners with dietary restrictions (vegan, vegetarian, gluten-free, nut-free, dairy-free)
- Health-conscious customers needing transparency about ingredients and allergens

## 3. Primary Benefits & Features

### Core Features (MVP)
- **One-Click Menu Filtering**: Customers can quickly see dishes compatible with their dietary restrictions
- **Rapid Recipe Upload**: Streamlined mobile/tablet interface with type-ahead search and auto-populated ingredients
- **Automated Allergen Detection**: Intelligent tagging based on ingredient database (OpenFoodFacts)
- **Compliance Dashboard**: Visual grid showing which diets each dish satisfies with clear explanations

### Premium Features (Future)
- **Intelligent Substitutions**: AI-powered suggestions to make recipes allergen-free for wider audiences
- **Cost Optimization**: Menu optimization based on ingredient costs
- **Enhanced Descriptions**: AI-assisted appealing dish descriptions

## 4. High-Level Tech Stack & Architecture

**Frontend**: React + TypeScript + Vite with Tailwind CSS and shadcn UI  
**Backend**: Hono (Node.js) with REST API endpoints  
**Database**: Embedded PostgreSQL via Drizzle ORM with migration support  
**Authentication**: Firebase Auth emulator (local mode, scaffolded for future expansion)  
**Data Source**: OpenFoodFacts database for ingredients and allergens  

**Architecture Pattern**: Modular, database-backed stack (create-volo-app foundation) designed for scalability across multiple cuisines, user accounts, and reporting features.

**UI Theme**: Warm, accessible color palette (#FAF8F4 background, #E6B450 highlight, #5B7F41 primary, #D05C45 secondary) with large, legible typography optimized for mobile/tablet use.

