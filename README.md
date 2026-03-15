**Explorix AI – Intelligent Travel Discovery Platform**

AI-powered travel assistant that combines geospatial search, transportation data, and conversational AI to help users explore places, plan journeys, and discover travel experiences.

Explorix integrates geospatial databases, AI reasoning, and real-time transport information into a unified travel exploration platform.
**
Project Overview**

Explorix is a mobile-first travel assistant designed to help users discover locations, plan journeys, and explore transportation options using natural language queries.

The system combines:

Geospatial data processing

AI-powered recommendations

Real-time transport data

User-generated travel content

Users can:

Discover nearby places using geospatial queries

Ask questions about locations using AI

Explore transport routes and journey options

Share travel experiences with other users

This project was developed as part of a Master’s Thesis in Applied Computer Science.

**Problem Statement
**
Travel planning typically requires users to interact with multiple separate platforms:

Maps for navigation

Transport apps for journeys

Travel blogs for recommendations

This fragmented ecosystem makes it difficult for users to discover places, understand transport options, and receive contextual travel recommendations in one system.

Explorix addresses this by integrating travel discovery, transport information, and AI assistance into a single platform.

**Research Objective**

The objective of this research is to design and implement an AI-powered travel assistant that:

Uses geospatial databases for location discovery

Integrates public transport APIs

Provides AI-driven travel recommendations

Enables social travel exploration

System Architecture

The Explorix platform consists of multiple layers:

Mobile Client

Backend API

Geospatial Database

AI Processing Layer

External Service Integrations

Architecture Diagram

(Insert your system architecture diagram here)

**Technology Stack**
Frontend

React Native

Expo

Backend

FastAPI

Python

Databases

PostgreSQL + PostGIS (Geospatial queries)

MongoDB (User-generated content)

Redis (Caching)

AI Integration

LLM for conversational travel assistant

RAG-based information retrieval

External APIs

Transport APIs

Map services

Key Features
Geospatial Place Discovery

Users can search for nearby places such as:

Restaurants

Museums

Parks

Tourist attractions

The system uses PostGIS spatial queries to identify places near the user’s location.

AI Travel Assistant

Users can ask questions such as:

“What are the best places to visit near Heidelberg?”

The system retrieves relevant travel data and generates AI responses.

**Transport Integration**

Explorix integrates public transport APIs to provide:

Journey routes

Departure times

Transport options

Social Travel Exploration

Users can share travel discoveries and experiences with other users, creating a community-driven exploration platform.
