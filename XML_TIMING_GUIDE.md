# XML Timing Feature Guide

## Overview
The XML Timing feature allows you to upload background images along with an XML file that specifies the exact timing for each image. This gives you precise control over when each image appears in your video, creating perfectly timed edits.

## Key Features
- 🎯 **Precise Timing**: Control exactly when each image appears and for how long
- 🔄 **Auto-Extension**: The last image automatically extends to the end of the video
- 📁 **Multiple Formats**: Supports custom XML, Final Cut Pro XML (FCPXML), and Adobe Premiere Pro XML formats
- 🎨 **Animation Support**: Works with the zoom animation feature
- 🔗 **Filename Matching**: Images are matched to XML entries by filename - names must match!
- ⚡ **Automatic**: Once uploaded, timings are applied automatically - no toggle needed

## How to Use

### Step 1: Prepare Your Images
Upload your background images using the "Add Bg" button. **Important:** Note the filenames of your images.

### Step 2: Create or Export Your XML File
Create an XML file where the image names match your uploaded filenames. You have three options:

#### Option 1: Simple Custom Format (Recommended for beginners)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<clips>
  <clip name="image1.jpg" start="0" end="5.5" />
  <clip name="image2.jpg" start="5.5" end="12.0" />
  <clip name="image3.jpg" start="12.0" end="18.5" />
  <!-- Last image extends to video end automatically -->
</clips>
```

**Attributes:**
- `name`: Image filename (should match your uploaded image)
- `start`: Start time in seconds
- `end`: End time in seconds

#### Option 2: Final Cut Pro XML (FCPXML)
Export your timeline from Final Cut Pro as XML. The tool will automatically parse:
- `<asset-clip>` elements
- `offset` attribute (start time in rational format like "150/30s")
- `duration` attribute (duration in rational format)
- `ref` attribute (links to asset name)

#### Option 3: Adobe Premiere Pro XML
Export your timeline from Premiere Pro as XML. The tool will parse:
- `<clipitem>` elements
- `<start>` and `<end>` tags (frame numbers)
- `<timebase>` for frame rate conversion
- `<file><name>` for image filename

### Step 3: Upload the XML File
1. Click the **"Add XML Timing (Optional)"** button
2. Select your XML file
3. You'll see a confirmation with the number of timing entries found
4. The button will show **"XML Timing (N entries)"** with a checkmark
5. **That's it!** The timings are automatically applied - no toggle needed

### Step 4: Generate Your Video
Generate audio and render the video as usual. The images will now follow the timings from your XML file!

## How Image Matching Works

The tool uses two methods to match XML timings to your images:

### Method 1: Filename Matching
The tool tries to match the `name` attribute in the XML to your uploaded image filenames. It's case-insensitive and flexible:
- `background1.jpg` matches `background1.jpg`
- `Background1.JPG` matches `background1.jpg`
- Partial matches are supported

### Method 2: Order-Based Matching
If filename matching doesn't work, the tool matches based on order:
- First XML entry → First uploaded image
- Second XML entry → Second uploaded image
- And so on...

**Tip:** For best results, name your images clearly and consistently!

## Special Behavior

### Last Image Auto-Extension
The last image in your sequence will **automatically extend to the end of the video**, regardless of its `end` time in the XML. This ensures your video has a complete background from start to finish.

**Example:**
- Video duration: 30 seconds
- Last image XML timing: start="20" end="25"
- **Actual behavior**: Last image plays from 20s to 30s (extended!)

## Supported XML Formats

### 1. Simple Custom Format
```xml
<clips>
  <clip name="file.jpg" start="0" end="5" />
</clips>
```
- ✅ Simple to create manually
- ✅ Easy to understand
- ✅ Direct second-based timing

### 2. Final Cut Pro XML (FCPXML)
```xml
<asset-clip name="file.jpg" offset="0/30s" duration="150/30s" ref="r2"/>
```
- ✅ Professional timeline export
- ✅ Rational time format (frames/framerate)
- ✅ Full project metadata

### 3. Premiere Pro XML
```xml
<clipitem>
  <file><name>file.jpg</name></file>
  <start>0</start>
  <end>150</end>
  <rate><timebase>30</timebase></rate>
</clipitem>
```
- ✅ Professional timeline export
- ✅ Frame-based timing
- ✅ Timeline sequences

## Troubleshooting

### "XML Parse Error"
- Check that your XML file is valid XML
- Ensure it uses one of the supported formats
- Verify the file isn't corrupted

### Images Don't Match Timing
- **Most Common Issue:** Filenames in XML don't match uploaded image filenames
- Check that names match exactly: `background1.jpg` in XML → `background1.jpg` uploaded
- Case doesn't matter: `Background1.JPG` will match `background1.jpg`
- If filename matching fails, system falls back to order-based matching (1st XML → 1st image)
- Ensure XML has the same number of entries as uploaded images for best results

### Timing Seems Off
- Verify times are in seconds (not frames) for custom format
- Check that your XML export uses the correct frame rate
- Ensure start/end times don't overlap unexpectedly

## Tips for Best Results

1. **Consistent Naming**: Use clear, consistent filenames like `bg1.jpg`, `bg2.jpg`, etc.
2. **No Gaps**: Ensure your timing entries connect smoothly (end of one = start of next)
3. **Test First**: Try with a small sequence before rendering long videos
4. **Sample Files**: Check the included `sample_timing.xml` and `sample_fcpxml.xml` files
5. **Animation**: Enable "Anim: On" for smooth Ken Burns-style zoom effects

## Example Workflow

1. Create your affirmation script
2. Generate audio with voiceover
3. Prepare 4 background images: `morning.jpg`, `nature.jpg`, `sunset.jpg`, `stars.jpg`
4. Create a simple XML file with timings (filenames must match!):
   ```xml
   <clips>
     <clip name="morning.jpg" start="0" end="8" />
     <clip name="nature.jpg" start="8" end="16" />
     <clip name="sunset.jpg" start="16" end="24" />
     <clip name="stars.jpg" start="24" end="32" />
   </clips>
   ```
5. Upload images via "Add Bg"
6. Upload XML via "Add XML Timing (Optional)"
7. Render your video - timings are applied automatically!

## Notes

- XML timing works with both static images and the animation feature
- Video backgrounds are not currently supported with XML timing
- The crossfade transition (1 second) is automatically applied between images
- XML timing is optional - without XML, images are distributed equally across the video
- **Filename matching is crucial** - ensure XML names match your uploaded image filenames
- Once XML is uploaded, timings are automatically applied - no additional steps needed

---

**Need Help?** Check the sample XML files included in the project folder for reference!

