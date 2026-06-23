# Set Up iPhone Widgets with Scriptable

Important to Me can show upcoming birthdays and events on your iPhone Home Screen through the free Scriptable app.

## Official Scriptable Links

- Scriptable App Store: <https://apps.apple.com/us/app/scriptable/id1405459188>
- Scriptable documentation: <https://docs.scriptable.app/>
- Widget documentation: <https://docs.scriptable.app/listwidget/>
- FileManager documentation: <https://docs.scriptable.app/filemanager/>
- DocumentPicker documentation: <https://docs.scriptable.app/documentpicker/>
- Widget parameter documentation: <https://docs.scriptable.app/args/>

## First-Time Setup

### Step 1: Install Scriptable

1. On your iPhone, open <https://apps.apple.com/us/app/scriptable/id1405459188>.
2. Tap **Get**.
3. Install Scriptable.
4. Open Scriptable once.

### Step 2: Copy the Widget Script

1. Open Important to Me.
2. Open **iPhone Widgets**.
3. Tap **Copy Widget Script**.
4. Wait for the confirmation that the script was copied.

### Step 3: Create the Script

1. Open Scriptable.
2. Tap the **+** button.
3. Tap inside the blank editor.
4. Press and hold.
5. Tap **Paste**.
6. Name the script exactly: `Important to Me`.
7. Tap **Done**.

### Step 4: Copy Your Widget Data

1. Return to Important to Me.
2. Open **iPhone Widgets**.
3. Choose what the widget should show.
4. Tap **Copy Widget Data**.
5. Wait for the success confirmation.

### Step 5: Import the Data into Scriptable

1. Open Scriptable.
2. Tap the **Important to Me** script to run it.
3. Tap **Import or Update from Clipboard**.
4. Confirm the import.
5. Verify that a widget preview appears.

### Step 6: Add the Widget to the iPhone Home Screen

1. Return to the iPhone Home Screen.
2. Press and hold an empty area until the icons begin moving.
3. Tap **Edit** or the **+** button at the top.
4. Tap **Add Widget** if that option appears.
5. Search for **Scriptable**.
6. Tap **Scriptable**.
7. Swipe to choose Small, Medium, or Large.
8. Tap **Add Widget**.
9. Press and hold the new Scriptable widget.
10. Tap **Edit Widget**.
11. Tap **Script**.
12. Select **Important to Me**.
13. If using a custom configuration, tap **Parameter** and paste the parameter copied from Important to Me.
14. Tap outside the menu to finish.

## Updating the Widget Later

1. Make changes inside Important to Me.
2. Open **iPhone Widgets**.
3. Tap **Copy Widget Data**.
4. Open Scriptable.
5. Run the **Important to Me** script.
6. Tap **Import or Update from Clipboard**.
7. The Home Screen widget will use the updated data.

The script usually needs to be installed only once. Data needs to be updated only when people, events, groups, or widget preferences change. Countdowns are recalculated by the widget; iOS may still delay visual refreshes.

## Troubleshooting

### “Script not found”

Press and hold the widget, tap **Edit Widget**, and choose the `Important to Me` script.

### “No widget data”

Return to Important to Me, tap **Copy Widget Data**, run the script in Scriptable, and choose **Import or Update from Clipboard**.

### “Clipboard does not contain valid data”

Copy Widget Data again and do not copy anything else before importing it. If needed, use **Download Widget Data** and **Choose JSON File**.

### “The widget is outdated”

Export the data again, import it in Scriptable again, and preview the script. iOS controls Home Screen refresh timing.

### “Scriptable does not appear in Add Widget”

Open Scriptable at least once, run the Important to Me script once, return to the Home Screen widget picker, and restart the iPhone only as a final step.

### “The widget is blank”

Run the script inside Scriptable, read the displayed error, reimport widget data, and confirm the correct script is selected in **Edit Widget**.

## Privacy

The widget export is created locally by Important to Me. It includes names, dates, relationship labels, favorites, group IDs, tags, and event labels needed for the widget. It intentionally excludes notes, photos, custom private fields, and birth locations. Scriptable stores the imported JSON locally by default in `ImportantToMe/important-to-me-widget-data.json`. Anyone with access to the unlocked phone or downloaded file may be able to read it; this is not encryption.
