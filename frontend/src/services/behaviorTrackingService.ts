import { BehaviorTrackingRequest, BehaviorEventData } from '../types';

// Configuration
const TRACKING_CONFIG = {
  // Batch size for sending events
  batchSize: 10,
  // Time to wait before sending incomplete batch (ms)
  batchTimeout: 30000,
  // Session timeout (ms)
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  // Whether to track in development
  enableInDevelopment: true,
  // API endpoint
  apiEndpoint: '/api/behavior/track',
};

// Event types
export const EVENT_TYPES = {
  RECIPE_VIEWED: 'recipe_viewed',
  RECIPE_SAVED: 'recipe_saved',
  RECIPE_COOKED: 'recipe_cooked',
  RECIPE_SHARED: 'recipe_shared',
  RECIPE_DISLIKED: 'recipe_disliked',
  RECIPE_RATED: 'recipe_rated',
  SEARCH_PERFORMED: 'search_performed',
  INGREDIENT_VIEWED: 'ingredient_viewed',
  MEAL_PLAN_CREATED: 'meal_plan_created',
  SHOPPING_LIST_GENERATED: 'shopping_list_generated',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  PREFERENCE_UPDATED: 'preference_updated',
  AI_RECIPE_GENERATED: 'ai_recipe_generated',
  RECOMMENDATION_CLICKED: 'recommendation_clicked',
  RECOMMENDATION_DISMISSED: 'recommendation_dismissed',
  PAGE_VIEW: 'page_view',
  FEATURE_USED: 'feature_used',
} as const;

// Source types
export const SOURCE_TYPES = {
  SEARCH: 'search',
  RECOMMENDATION: 'recommendation',
  BROWSE: 'browse',
  AI_GENERATED: 'ai_generated',
  MEAL_PLAN: 'meal_plan',
  SHOPPING_LIST: 'shopping_list',
  DIRECT: 'direct',
} as const;

interface TrackedEvent {
  id: string;
  timestamp: number;
  event: BehaviorTrackingRequest;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  eventsTracked: number;
}

class BehaviorTrackingService {
  private userId: string | null = null;
  private sessionData: SessionData | null = null;
  private eventQueue: TrackedEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private scrollDepthTracked: Set<number> = new Set();
  private startTime: number = Date.now();
  private interactionStartTime: number | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushPendingEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Listen for beforeunload to flush events
    window.addEventListener('beforeunload', () => {
      this.flushPendingEvents(true);
    });

    // Track scroll depth
    this.initializeScrollTracking();

    // Initialize session
    this.initializeSession();
  }

  private initializeSession() {
    const existingSession = localStorage.getItem('mealplanner_session');
    
    if (existingSession) {
      try {
        const parsed = JSON.parse(existingSession);
        if (Date.now() - parsed.lastActivity < TRACKING_CONFIG.sessionTimeout) {
          this.sessionData = parsed;
          if (this.sessionData) {
            this.sessionData.lastActivity = Date.now();
            this.updateSessionStorage();
          }
          return;
        }
      } catch (error) {
        console.warn('Failed to parse existing session:', error);
      }
    }

    // Create new session
    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      eventsTracked: 0,
    };
    
    this.updateSessionStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSessionStorage() {
    if (this.sessionData) {
      localStorage.setItem('mealplanner_session', JSON.stringify(this.sessionData));
    }
  }

  private initializeScrollTracking() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.trackScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private trackScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    // Track at 25%, 50%, 75%, 100%
    const milestones = [25, 50, 75, 100];
    
    for (const milestone of milestones) {
      if (scrollPercent >= milestone && !this.scrollDepthTracked.has(milestone)) {
        this.scrollDepthTracked.add(milestone);
        
        // Track scroll milestone
        this.track(EVENT_TYPES.PAGE_VIEW, {
          event_data: {
            scroll_depth: milestone / 100,
            time_on_page: Date.now() - this.startTime,
          },
          source: SOURCE_TYPES.DIRECT,
        });
        
        break; // Only track one milestone per scroll event
      }
    }
  }

  private handlePageHidden() {
    if (this.interactionStartTime) {
      const duration = Date.now() - this.interactionStartTime;
      this.track(EVENT_TYPES.PAGE_VIEW, {
        event_data: {
          duration,
          time_of_day: this.getTimeOfDay(),
        },
        source: SOURCE_TYPES.DIRECT,
      });
    }
    
    this.flushPendingEvents(true);
  }

  private handlePageVisible() {
    this.interactionStartTime = Date.now();
    this.startTime = Date.now();
    this.scrollDepthTracked.clear();
  }

  // Public methods

  public setUserId(userId: string) {
    this.userId = userId;
  }

  public track(
    eventType: string,
    options: {
      recipe_id?: string;
      ingredient_id?: string;
      event_data?: BehaviorEventData;
      source?: string;
    } = {}
  ) {
    if (!this.userId || !this.sessionData) {
      console.warn('Behavior tracking: User ID or session not initialized');
      return;
    }

    // Skip tracking in development if disabled
    if (process.env.NODE_ENV === 'development' && !TRACKING_CONFIG.enableInDevelopment) {
      return;
    }

    const event: BehaviorTrackingRequest = {
      user_id: this.userId,
      event_type: eventType,
      recipe_id: options.recipe_id,
      event_data: {
        ...options.event_data,
        timestamp: new Date().toISOString(),
      },
      session_id: this.sessionData.sessionId,
      device_type: this.getDeviceType(),
      source: options.source || SOURCE_TYPES.DIRECT,
    };

    const trackedEvent: TrackedEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      event,
    };

    this.eventQueue.push(trackedEvent);
    this.sessionData.eventsTracked++;
    this.sessionData.lastActivity = Date.now();
    this.updateSessionStorage();

    // Send batch if queue is full
    if (this.eventQueue.length >= TRACKING_CONFIG.batchSize) {
      this.flushPendingEvents();
    } else if (!this.batchTimer) {
      // Set timer to send incomplete batch
      this.batchTimer = setTimeout(() => {
        this.flushPendingEvents();
      }, TRACKING_CONFIG.batchTimeout);
    }
  }

  // Convenience methods for common events

  public trackRecipeView(recipeId: string, source: string = SOURCE_TYPES.BROWSE, duration?: number) {
    this.track(EVENT_TYPES.RECIPE_VIEWED, {
      recipe_id: recipeId,
      source,
      event_data: {
        duration,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackRecipeSave(recipeId: string, source: string = SOURCE_TYPES.BROWSE) {
    this.track(EVENT_TYPES.RECIPE_SAVED, {
      recipe_id: recipeId,
      source,
      event_data: {
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackRecipeCooked(recipeId: string, rating?: number, modifications?: string) {
    this.track(EVENT_TYPES.RECIPE_COOKED, {
      recipe_id: recipeId,
      source: SOURCE_TYPES.DIRECT,
      event_data: {
        rating,
        time_of_day: this.getTimeOfDay(),
        modifications_made: modifications,
      },
    });
  }

  public trackRecipeRating(recipeId: string, rating: number, wouldCookAgain?: boolean) {
    this.track(EVENT_TYPES.RECIPE_RATED, {
      recipe_id: recipeId,
      source: SOURCE_TYPES.DIRECT,
      event_data: {
        rating,
        would_cook_again: wouldCookAgain,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackSearch(query: string, resultsCount: number, filters?: any) {
    this.track(EVENT_TYPES.SEARCH_PERFORMED, {
      source: SOURCE_TYPES.SEARCH,
      event_data: {
        search_query: query,
        results_count: resultsCount,
        filters_applied: filters ? Object.keys(filters).length : 0,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackRecommendationClick(recipeId: string, recommendationReason: string[], position: number) {
    this.track(EVENT_TYPES.RECOMMENDATION_CLICKED, {
      recipe_id: recipeId,
      source: SOURCE_TYPES.RECOMMENDATION,
      event_data: {
        recommendation_reasons: recommendationReason,
        position_in_list: position,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackFeatureUsage(featureName: string, context?: any) {
    this.track(EVENT_TYPES.FEATURE_USED, {
      source: SOURCE_TYPES.DIRECT,
      event_data: {
        feature_name: featureName,
        context,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackAIRecipeGeneration(prompt: string, success: boolean, processingTime?: number) {
    this.track(EVENT_TYPES.AI_RECIPE_GENERATED, {
      source: SOURCE_TYPES.AI_GENERATED,
      event_data: {
        search_query: prompt,
        generation_success: success,
        processing_time_ms: processingTime,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackPageView(pageName: string, referrer?: string) {
    if (this.sessionData) {
      this.sessionData.pageViews++;
      this.updateSessionStorage();
    }

    this.track(EVENT_TYPES.PAGE_VIEW, {
      source: SOURCE_TYPES.DIRECT,
      event_data: {
        page_name: pageName,
        referrer,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  public trackOnboardingStep(step: string, completed: boolean, timeSpent?: number) {
    this.track(EVENT_TYPES.ONBOARDING_STEP_COMPLETED, {
      source: SOURCE_TYPES.DIRECT,
      event_data: {
        onboarding_step: step,
        completed,
        time_spent_ms: timeSpent,
        time_of_day: this.getTimeOfDay(),
      },
    });
  }

  private async flushPendingEvents(synchronous: boolean = false) {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const method = synchronous ? 'sendBeacon' : 'fetch';
      await this.sendEvents(eventsToSend, method);
    } catch (error) {
      console.warn('Failed to send behavior events:', error);
      
      // If we're online, add failed events back to queue
      if (this.isOnline && !synchronous) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  private async sendEvents(events: TrackedEvent[], method: 'fetch' | 'sendBeacon' = 'fetch') {
    const payload = {
      events: events.map(e => e.event),
      session_data: this.sessionData,
      batch_info: {
        batch_size: events.length,
        oldest_event_age: Date.now() - Math.min(...events.map(e => e.timestamp)),
      },
    };

    if (method === 'sendBeacon' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(TRACKING_CONFIG.apiEndpoint, blob);
    } else {
      const response = await fetch(TRACKING_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  // Analytics and insights

  public getSessionStats() {
    return {
      session_id: this.sessionData?.sessionId,
      duration: this.sessionData ? Date.now() - this.sessionData.startTime : 0,
      page_views: this.sessionData?.pageViews || 0,
      events_tracked: this.sessionData?.eventsTracked || 0,
      pending_events: this.eventQueue.length,
    };
  }

  public clearSession() {
    this.flushPendingEvents(true);
    localStorage.removeItem('mealplanner_session');
    this.sessionData = null;
    this.eventQueue = [];
    this.scrollDepthTracked.clear();
  }

  // Debug methods

  public getQueueStatus() {
    return {
      queue_length: this.eventQueue.length,
      batch_size: TRACKING_CONFIG.batchSize,
      batch_timeout: TRACKING_CONFIG.batchTimeout,
      is_online: this.isOnline,
      has_batch_timer: !!this.batchTimer,
    };
  }

  public enableDebugMode() {
    (window as any).behaviorTracker = {
      getSessionStats: () => this.getSessionStats(),
      getQueueStatus: () => this.getQueueStatus(),
      flushEvents: () => this.flushPendingEvents(),
      clearSession: () => this.clearSession(),
    };
    
    console.log('Behavior tracking debug mode enabled. Use window.behaviorTracker to inspect state.');
  }
}

// Create singleton instance
const behaviorTracker = new BehaviorTrackingService();

// Auto-track page views for React Router
let currentPath = window.location.pathname;
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function(...args) {
  originalPushState.apply(window.history, args);
  handleRouteChange();
};

window.history.replaceState = function(...args) {
  originalReplaceState.apply(window.history, args);
  handleRouteChange();
};

window.addEventListener('popstate', handleRouteChange);

function handleRouteChange() {
  const newPath = window.location.pathname;
  if (newPath !== currentPath) {
    behaviorTracker.trackPageView(newPath, currentPath);
    currentPath = newPath;
  }
}

// Enhanced tracking hooks for React components
export const useBehaviorTracking = () => {
  const trackRecipeInteraction = (
    action: 'view' | 'save' | 'cook' | 'rate' | 'share',
    recipeId: string,
    metadata?: any
  ) => {
    switch (action) {
      case 'view':
        behaviorTracker.trackRecipeView(recipeId, metadata?.source, metadata?.duration);
        break;
      case 'save':
        behaviorTracker.trackRecipeSave(recipeId, metadata?.source);
        break;
      case 'cook':
        behaviorTracker.trackRecipeCooked(recipeId, metadata?.rating, metadata?.modifications);
        break;
      case 'rate':
        behaviorTracker.trackRecipeRating(recipeId, metadata?.rating, metadata?.wouldCookAgain);
        break;
      case 'share':
        behaviorTracker.track(EVENT_TYPES.RECIPE_SHARED, {
          recipe_id: recipeId,
          source: SOURCE_TYPES.DIRECT,
          event_data: metadata,
        });
        break;
    }
  };

  return {
    trackRecipeInteraction,
    trackSearch: behaviorTracker.trackSearch.bind(behaviorTracker),
    trackFeatureUsage: behaviorTracker.trackFeatureUsage.bind(behaviorTracker),
    trackAIGeneration: behaviorTracker.trackAIRecipeGeneration.bind(behaviorTracker),
    trackRecommendationClick: behaviorTracker.trackRecommendationClick.bind(behaviorTracker),
    getSessionStats: behaviorTracker.getSessionStats.bind(behaviorTracker),
  };
};

export default behaviorTracker; 