import { calculateExactAge, calculateNextAnniversary } from '../../date-engine/engine';
import { db } from '../../database/db';
import type { Person, Event } from '../../models/types';

export interface MinimizedWidgetPayloadItem {
  id: string;
  displayName: string;
  ageString: string;
  daysUntilBirthday: number;
  nextBirthdayDate: string;
  nextBirthdayWeekday: string;
  turnsAge: number;
  isFavorite: boolean;
  relationship?: string;
}

export interface MinimizedWidgetPayload {
  lastUpdated: string;
  items: MinimizedWidgetPayloadItem[];
  upcomingEvents: Array<{
    id: string;
    eventName: string;
    originalDate: string;
    daysRemaining: number;
    displayName: string;
  }>;
}

// Compiles a highly dense JSON format suitable for native UserDefaults / App Group mapping
export async function generateWidgetPayload(): Promise<MinimizedWidgetPayload> {
  const people = await db.people.toArray();
  const events = await db.events.toArray();
  const now = new Date();

  const payloadItems: MinimizedWidgetPayloadItem[] = people.map(p => {
    const age = calculateExactAge(p.dob, now, p.birthTime);
    const anniv = calculateNextAnniversary(p.dob, now);

    let ageDisplay = '';
    if (age.isYearUnknown) {
      ageDisplay = `${age.totalDays}d`;
    } else {
      ageDisplay = `${age.years}y ${age.months}m ${age.days}d`;
    }

    return {
      id: p.id,
      displayName: p.displayName || `${p.firstName} ${p.lastName}`,
      ageString: ageDisplay,
      daysUntilBirthday: anniv.daysOnlyRemaining,
      nextBirthdayDate: anniv.dateStr,
      nextBirthdayWeekday: anniv.dayOfWeek,
      turnsAge: anniv.anniversaryNumber || 0,
      isFavorite: p.isFavorite,
      relationship: p.relationship,
    };
  });

  // Sort payload item with smart logic (urgent first, favorites always prioritized)
  payloadItems.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.daysUntilBirthday - b.daysUntilBirthday;
  });

  const payloadEvents = events.map(e => {
    const anniv = calculateNextAnniversary(e.originalDate, now);
    return {
      id: e.id,
      eventName: e.eventName,
      originalDate: e.originalDate,
      daysRemaining: anniv.daysOnlyRemaining,
      displayName: e.eventName,
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 10);

  return {
    lastUpdated: new Date().toISOString(),
    items: payloadItems,
    upcomingEvents: payloadEvents,
  };
}

// Write payload to console & localStorage mock for web preview
export async function syncWidgetPayloadToCapacitorBridge() {
  try {
    const payload = await generateWidgetPayload();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('important_dates_widget_payload', JSON.stringify(payload));
      }
    } catch (storageErr) {
      console.warn('LocalStorage write blocked by security permissions inside preview iframe:', storageErr);
    }
    
    // In a real Capacitor iOS environment, we use native bridges:
    // import { CapWidgetBridge } from 'capacitor-widget-bridge';
    // await CapWidgetBridge.writeToAppGroup({ suite: "group.com.importantdates.widgets", payload: payload });
    
    console.log('Widget Payload synchronized.', payload);
  } catch (err) {
    console.warn('Widget sync error:', err);
  }
}

// Swift SwiftUI WidgetKit Native Codes Template
export const SWIFT_WIDGET_CODE = `
//
//  ImportantDatesWidget.swift
//  Important Dates Widgets
//
//  Created for iOS Xcode developers.
//

import WidgetKit
import SwiftUI

// Struct mapping the generated JSON payload
struct WidgetPayload: Codable {
    let lastUpdated: String
    let items: [WidgetPersonItem]
    let upcomingEvents: [WidgetEventItem]
}

struct WidgetPersonItem: Codable, Identifiable {
    let id: String
    let displayName: String
    let ageString: String
    let daysUntilBirthday: Int
    let nextBirthdayDate: String
    let nextBirthdayWeekday: String
    let turnsAge: Int
    let isFavorite: Bool
    let relationship: String?
}

struct WidgetEventItem: Codable, Identifiable {
    let id: String
    let eventName: String
    let originalDate: String
    let daysRemaining: Int
    let displayName: String
}

// Timeline Provider retrieving from shared App Group UserDefaults
struct Provider: TimelineProvider {
    typealias Entry = SimpleEntry
    
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), items: [
            WidgetPersonItem(id: "1", displayName: "Alex", ageString: "5y 2m 27d", daysUntilBirthday: 4, nextBirthdayDate: "2027-03-26", nextBirthdayWeekday: "Thursday", turnsAge: 6, isFavorite: true, relationship: "Son")
        ], upcomingCount: 1)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = retrieveEntryFromAppGroup()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = retrieveEntryFromAppGroup()
        // Refresh every 3 hours
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 3, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func retrieveEntryFromAppGroup() -> SimpleEntry {
        let defaults = UserDefaults(suiteName: "group.com.importantdates.widgets")
        guard let jsonString = defaults?.string(forKey: "important_dates_payload"),
              let jsonData = jsonString.data(using: .utf8) else {
            return SimpleEntry(date: Date(), items: [], upcomingCount: 0)
        }
        
        do {
            let decoded = try JSONDecoder().decode(WidgetPayload.self, from: jsonData)
            return SimpleEntry(date: Date(), items: decoded.items, upcomingCount: decoded.upcomingEvents.count)
        } catch {
            return SimpleEntry(date: Date(), items: [], upcomingCount: 0)
        }
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let items: [WidgetPersonItem]
    let upcomingCount: Int
}

// SwiftUI Widget Views
struct ImportantDatesWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\\.widgetFamily) var family

    var body: some View {
        ZStyleBodyView(entry: entry, family: family)
    }
}

struct ZStyleBodyView: View {
    let entry: SimpleEntry
    let family: WidgetFamily
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Dates ❤️")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.pink)
                Spacer()
            }
            
            if entry.items.isEmpty {
                Text("No upcoming events")
                    .font(.footnote)
                    .foregroundColor(.gray)
            } else {
                let primary = entry.items.first!
                VStack(alignment: .leading, spacing: 2) {
                    Text(primary.displayName)
                        .font(.headline)
                        .bold()
                    Text(primary.ageString)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text("Turns \\(primary.turnsAge) in \\(primary.daysUntilBirthday) days")
                        .font(.caption2)
                        .bold()
                        .padding(4)
                        .background(Color.pink.opacity(0.15))
                        .cornerRadius(6)
                }
            }
        }
        .padding()
    }
}

@main
struct ImportantDatesWidget: Widget {
    let kind: String = "ImportantDatesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ImportantDatesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Upcoming Birthdays")
        .description("Never miss another anniversary or birthday.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
`;
