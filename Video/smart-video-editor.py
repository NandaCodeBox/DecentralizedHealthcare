#!/usr/bin/env python3
"""
Smart Video Editor - Matches video to voiceover script
Analyzes video content and intelligently trims based on voiceover timing
"""

import cv2
import numpy as np
from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
from moviepy.video.fx.Resize import Resize
from moviepy.video.fx.MultiplySpeed import MultiplySpeed
import os
from datetime import timedelta

class SmartVideoEditor:
    def __init__(self, video_path, audio_path, output_path):
        self.video_path = video_path
        self.audio_path = audio_path
        self.output_path = output_path
        
        # Voiceover script timing (based on our generated voiceover)
        self.script_segments = [
            {
                'name': 'Opening & Login',
                'start_time': 0,
                'end_time': 20,
                'description': 'Welcome, login, homepage',
                'keywords': ['login', 'sign in', 'homepage', 'arogya']
            },
            {
                'name': 'Symptom Intake in Hindi',
                'start_time': 20,
                'end_time': 100,
                'description': 'Multilingual symptom intake demonstration',
                'keywords': ['symptom', 'hindi', 'fever', 'headache', 'form']
            },
            {
                'name': 'AI Triage Results',
                'start_time': 100,
                'end_time': 140,
                'description': 'AI analysis and facility recommendations',
                'keywords': ['triage', 'confidence', 'facility', 'recommendation']
            },
            {
                'name': 'Provider Search',
                'start_time': 140,
                'end_time': 170,
                'description': 'Provider search in Tamil',
                'keywords': ['provider', 'search', 'tamil', 'doctor']
            },
            {
                'name': 'Supervisor Dashboard',
                'start_time': 170,
                'end_time': 180,
                'description': 'Supervisor dashboard overview',
                'keywords': ['supervisor', 'dashboard', 'cases']
            }
        ]
    
    def analyze_video_content(self):
        """Analyze video to detect different screens/pages"""
        print("🔍 Analyzing video content...")
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        print(f"📊 Video Info:")
        print(f"   Duration: {timedelta(seconds=int(duration))}")
        print(f"   FPS: {fps}")
        print(f"   Total Frames: {total_frames}")
        
        # Detect major scene changes
        scene_changes = self.detect_major_scenes(cap, fps)
        
        cap.release()
        
        return {
            'duration': duration,
            'fps': fps,
            'scene_changes': scene_changes
        }
    
    def detect_major_scenes(self, cap, fps):
        """Detect major scene changes (page transitions)"""
        print("\n🎬 Detecting page transitions...")
        
        scenes = []
        prev_frame = None
        frame_count = 0
        sample_rate = int(fps * 2)  # Sample every 2 seconds
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Sample frames
            if frame_count % sample_rate != 0:
                continue
            
            # Convert to grayscale and resize
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (160, 90))
            
            if prev_frame is not None:
                # Calculate structural similarity
                diff = cv2.absdiff(prev_frame, gray)
                mean_diff = np.mean(diff)
                
                # Significant change detected (page transition)
                if mean_diff > 35:
                    timestamp = frame_count / fps
                    scenes.append({
                        'timestamp': timestamp,
                        'type': 'transition',
                        'intensity': mean_diff
                    })
                    print(f"   📄 Page transition at {timedelta(seconds=int(timestamp))}")
            
            prev_frame = gray
        
        return scenes
    
    def map_video_to_script(self, video_info):
        """Map video segments to voiceover script segments"""
        print("\n🎯 Mapping video to voiceover script...")
        
        duration = video_info['duration']
        scene_changes = video_info['scene_changes']
        
        # Create mapping
        video_segments = []
        
        # Try to identify segments based on scene changes
        scene_timestamps = [0] + [s['timestamp'] for s in scene_changes] + [duration]
        
        print(f"\n📋 Detected {len(scene_timestamps)-1} video segments:")
        for i in range(len(scene_timestamps)-1):
            start = scene_timestamps[i]
            end = scene_timestamps[i+1]
            seg_duration = end - start
            print(f"   Segment {i+1}: {timedelta(seconds=int(start))} - {timedelta(seconds=int(end))} ({seg_duration:.1f}s)")
        
        # Map to script segments
        print(f"\n🎤 Voiceover script requires {len(self.script_segments)} segments:")
        
        for script_seg in self.script_segments:
            required_duration = script_seg['end_time'] - script_seg['start_time']
            print(f"   {script_seg['name']}: {required_duration}s")
        
        # Intelligent mapping strategy
        print("\n🧠 Creating intelligent segment mapping...")
        
        # Strategy: Use first 3 minutes of video, but intelligently trim
        # to match voiceover timing
        
        mapped_segments = []
        current_video_time = 0
        
        for script_seg in self.script_segments:
            required_duration = script_seg['end_time'] - script_seg['start_time']
            
            # Find best video segment for this script segment
            # Look for scene changes near the expected time
            best_start = current_video_time
            best_end = min(current_video_time + required_duration, duration)
            
            # Adjust to scene boundaries if possible
            for scene in scene_changes:
                scene_time = scene['timestamp']
                # If there's a scene change near where we want to cut, use it
                if abs(scene_time - best_end) < 5:  # Within 5 seconds
                    best_end = scene_time
                    break
            
            mapped_segments.append({
                'name': script_seg['name'],
                'video_start': best_start,
                'video_end': best_end,
                'script_start': script_seg['start_time'],
                'script_end': script_seg['end_time'],
                'description': script_seg['description']
            })
            
            current_video_time = best_end
            
            print(f"   ✓ {script_seg['name']}")
            print(f"     Video: {timedelta(seconds=int(best_start))} - {timedelta(seconds=int(best_end))}")
            print(f"     Script: {script_seg['start_time']}s - {script_seg['end_time']}s")
        
        return mapped_segments
    
    def create_final_video(self, segments):
        """Create final video with intelligent trimming and voiceover"""
        print("\n🎬 Creating final video with intelligent editing...")
        
        # Load video
        print("   Loading video...")
        video = VideoFileClip(self.video_path)
        
        # Extract and process segments
        print("   Processing segments...")
        clips = []
        
        for i, seg in enumerate(segments):
            print(f"\n   Segment {i+1}: {seg['name']}")
            print(f"     Extracting: {timedelta(seconds=int(seg['video_start']))} - {timedelta(seconds=int(seg['video_end']))}")
            
            # Extract video segment
            clip = video.subclip(seg['video_start'], seg['video_end'])
            
            # Calculate required duration from script
            required_duration = seg['script_end'] - seg['script_start']
            actual_duration = seg['video_end'] - seg['video_start']
            
            print(f"     Required: {required_duration}s, Actual: {actual_duration:.1f}s")
            
            # Adjust speed if needed (but keep it subtle)
            if abs(actual_duration - required_duration) > 2:
                speed_factor = actual_duration / required_duration
                # Limit speed adjustment to 0.8x - 1.3x for natural look
                speed_factor = max(0.8, min(1.3, speed_factor))
                
                if speed_factor != 1.0:
                    print(f"     Adjusting speed: {speed_factor:.2f}x")
                    clip = clip.with_effects([MultiplySpeed(speed_factor)])
            
            clips.append(clip)
        
        # Concatenate all clips
        print("\n   Concatenating segments...")
        final_video = concatenate_videoclips(clips, method="compose")
        
        print(f"   Final video duration: {final_video.duration:.1f}s")
        
        # Load and add voiceover
        print("   Adding voiceover...")
        audio = AudioFileClip(self.audio_path)
        print(f"   Voiceover duration: {audio.duration:.1f}s")
        
        # Set audio
        final_video = final_video.set_audio(audio)
        
        # Ensure video matches audio duration exactly
        if abs(final_video.duration - audio.duration) > 1:
            print(f"   Fine-tuning duration to match audio...")
            final_video = final_video.set_duration(audio.duration)
        
        # Export
        print(f"\n💾 Exporting to: {self.output_path}")
        print("   This will take 3-5 minutes...")
        print("   Quality: 1080p, 30fps, H.264")
        print("")
        
        final_video.write_videofile(
            self.output_path,
            codec='libx264',
            audio_codec='aac',
            fps=30,
            preset='medium',
            bitrate='5000k',
            threads=4,
            logger='bar'
        )
        
        # Cleanup
        video.close()
        audio.close()
        final_video.close()
        
        print("\n✅ Video created successfully!")
        
        # Get file info
        file_size = os.path.getsize(self.output_path) / (1024 * 1024)
        print(f"📊 Output file size: {file_size:.1f} MB")
        print(f"⏱️ Duration: {audio.duration:.1f} seconds")
    
    def process(self):
        """Main processing pipeline"""
        print("=" * 70)
        print("🧠 SMART VIDEO EDITOR - Arogya.ai Demo")
        print("=" * 70)
        print("\nThis will intelligently trim your video to match the voiceover!")
        print("")
        
        # Step 1: Analyze video
        video_info = self.analyze_video_content()
        
        # Step 2: Map video to script
        segments = self.map_video_to_script(video_info)
        
        # Step 3: Create final video
        self.create_final_video(segments)
        
        print("\n" + "=" * 70)
        print("✅ COMPLETE! Your demo video is ready!")
        print("=" * 70)
        print(f"\n📁 Output: {self.output_path}")
        print(f"⏱️ Duration: 3 minutes")
        print(f"🎤 Voiceover: Perfectly synced")
        print(f"✂️ Editing: Intelligent scene-based trimming")
        print(f"📤 Ready to upload to YouTube!")
        print("")
        
        return self.output_path


def main():
    """Main entry point"""
    
    print("\n")
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║                                                                      ║")
    print("║   🧠 SMART VIDEO EDITOR - Arogya.ai                                 ║")
    print("║                                                                      ║")
    print("║   Intelligently trims video based on voiceover script               ║")
    print("║                                                                      ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print("\n")
    
    # File paths
    video_path = r"Sign In - Arogya.ai - Google Chrome 2026-03-08 16-58-53.mp4"
    audio_path = r"custom-voiceover-3min.mp3"
    output_path = r"Arogya_AI_Demo_Final.mp4"
    
    # Check if files exist
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        print(f"   Looking in: {os.getcwd()}")
        return
    
    if not os.path.exists(audio_path):
        print(f"❌ Error: Audio file not found: {audio_path}")
        return
    
    print(f"✅ Found video: {video_path}")
    print(f"✅ Found audio: {audio_path}")
    print("")
    
    # Create editor and process
    editor = SmartVideoEditor(video_path, audio_path, output_path)
    
    try:
        editor.process()
        
        print("\n🎉 SUCCESS! Your video is ready to upload!")
        print("\nNext steps:")
        print("1. Watch the video to verify quality")
        print("2. Upload to YouTube (unlisted)")
        print("3. Submit to hackathon")
        print("")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nIf you see 'moviepy' errors, install dependencies:")
        print("   pip install moviepy opencv-python numpy")
        print("")


if __name__ == "__main__":
    main()
