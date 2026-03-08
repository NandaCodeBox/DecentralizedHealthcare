#!/usr/bin/env python3
"""
Intelligent Video Editor for Arogya.ai Demo
Analyzes video frames and creates optimized 3-minute demo with voiceover
"""

import cv2
import numpy as np
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
from moviepy.video.fx import speedx
import os
from datetime import timedelta
import json

class IntelligentVideoEditor:
    def __init__(self, video_path, audio_path, output_path):
        self.video_path = video_path
        self.audio_path = audio_path
        self.output_path = output_path
        self.target_duration = 180  # 3 minutes
        
    def analyze_video(self):
        """Analyze video to detect scenes and key moments"""
        print("🎬 Analyzing video frames...")
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        print(f"📊 Video Info:")
        print(f"   Duration: {timedelta(seconds=int(duration))}")
        print(f"   FPS: {fps}")
        print(f"   Total Frames: {total_frames}")
        print(f"   Resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
        
        # Detect scene changes
        print("\n🔍 Detecting scene changes...")
        scene_changes = self.detect_scene_changes(cap, fps)
        
        cap.release()
        
        return {
            'duration': duration,
            'fps': fps,
            'total_frames': total_frames,
            'scene_changes': scene_changes
        }
    
    def detect_scene_changes(self, cap, fps, threshold=30):
        """Detect significant scene changes in video"""
        scene_changes = [0]  # Start with beginning
        prev_frame = None
        frame_count = 0
        sample_rate = int(fps)  # Sample every second
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Sample frames (check every second)
            if frame_count % sample_rate != 0:
                continue
            
            # Convert to grayscale for comparison
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (160, 90))  # Reduce size for faster processing
            
            if prev_frame is not None:
                # Calculate difference between frames
                diff = cv2.absdiff(prev_frame, gray)
                mean_diff = np.mean(diff)
                
                # If significant change detected
                if mean_diff > threshold:
                    timestamp = frame_count / fps
                    scene_changes.append(timestamp)
                    print(f"   Scene change at {timedelta(seconds=int(timestamp))}")
            
            prev_frame = gray
        
        # Add end timestamp
        scene_changes.append(frame_count / fps)
        
        return scene_changes
    
    def identify_key_segments(self, video_info):
        """Identify the most important segments to keep"""
        print("\n🎯 Identifying key segments...")
        
        duration = video_info['duration']
        scene_changes = video_info['scene_changes']
        
        # Define segments based on typical demo flow
        segments = []
        
        # Segment 1: Login (first 20 seconds)
        if duration >= 20:
            segments.append({
                'name': 'Login & Homepage',
                'start': 0,
                'end': 20,
                'priority': 10,
                'description': 'User login and homepage view'
            })
        
        # Segment 2: Main demo (20 seconds to 2 minutes)
        if duration >= 120:
            segments.append({
                'name': 'Symptom Intake',
                'start': 20,
                'end': 120,
                'priority': 10,
                'description': 'Core feature demonstration'
            })
        
        # Segment 3: Results (2 minutes to 3 minutes)
        if duration >= 180:
            segments.append({
                'name': 'AI Results',
                'start': 120,
                'end': 180,
                'priority': 9,
                'description': 'AI triage and recommendations'
            })
        
        # Segment 4: Additional features (3 minutes to 4 minutes)
        if duration >= 240:
            segments.append({
                'name': 'Provider Search',
                'start': 180,
                'end': 240,
                'priority': 8,
                'description': 'Provider search feature'
            })
        
        # Segment 5: Supervisor dashboard (4 minutes to end)
        if duration >= 240:
            segments.append({
                'name': 'Supervisor Dashboard',
                'start': 240,
                'end': min(duration, 300),
                'priority': 7,
                'description': 'Admin features'
            })
        
        return segments
    
    def optimize_segments(self, segments, target_duration):
        """Optimize segments to fit target duration"""
        print(f"\n✂️ Optimizing segments to fit {target_duration} seconds...")
        
        total_duration = sum(seg['end'] - seg['start'] for seg in segments)
        
        if total_duration <= target_duration:
            print(f"   ✅ Video is already {total_duration}s, no trimming needed")
            return segments
        
        # Sort by priority
        segments.sort(key=lambda x: x['priority'], reverse=True)
        
        # Keep segments until we reach target duration
        optimized = []
        current_duration = 0
        
        for seg in segments:
            seg_duration = seg['end'] - seg['start']
            
            if current_duration + seg_duration <= target_duration:
                optimized.append(seg)
                current_duration += seg_duration
                print(f"   ✅ Keeping: {seg['name']} ({seg_duration}s)")
            else:
                remaining = target_duration - current_duration
                if remaining > 10:  # Only include if at least 10 seconds
                    seg['end'] = seg['start'] + remaining
                    optimized.append(seg)
                    current_duration += remaining
                    print(f"   ✂️ Trimming: {seg['name']} to {remaining}s")
                else:
                    print(f"   ❌ Skipping: {seg['name']} (not enough time)")
                break
        
        # Sort back by start time
        optimized.sort(key=lambda x: x['start'])
        
        return optimized
    
    def create_final_video(self, segments):
        """Create final video with selected segments and voiceover"""
        print("\n🎬 Creating final video...")
        
        # Load original video
        print("   Loading video...")
        video = VideoFileClip(self.video_path)
        
        # Extract segments
        print("   Extracting segments...")
        clips = []
        for i, seg in enumerate(segments):
            print(f"   Segment {i+1}: {seg['name']} ({seg['start']:.1f}s - {seg['end']:.1f}s)")
            clip = video.subclip(seg['start'], seg['end'])
            clips.append(clip)
        
        # Concatenate clips
        print("   Concatenating clips...")
        final_video = concatenate_videoclips(clips, method="compose")
        
        # Check if we need to speed up slightly to match audio
        video_duration = final_video.duration
        print(f"   Video duration: {video_duration:.1f}s")
        
        # Load audio
        print("   Loading voiceover...")
        audio = AudioFileClip(self.audio_path)
        audio_duration = audio.duration
        print(f"   Audio duration: {audio_duration:.1f}s")
        
        # Adjust video speed if needed to match audio
        if abs(video_duration - audio_duration) > 2:
            speed_factor = video_duration / audio_duration
            print(f"   Adjusting video speed: {speed_factor:.2f}x")
            final_video = speedx(final_video, factor=speed_factor)
        
        # Set audio
        print("   Adding voiceover...")
        final_video = final_video.set_audio(audio)
        
        # Export
        print(f"\n💾 Exporting to: {self.output_path}")
        print("   This may take a few minutes...")
        
        final_video.write_videofile(
            self.output_path,
            codec='libx264',
            audio_codec='aac',
            fps=30,
            preset='medium',
            bitrate='5000k',
            threads=4
        )
        
        # Cleanup
        video.close()
        audio.close()
        final_video.close()
        
        print("\n✅ Video created successfully!")
        
        # Get file size
        file_size = os.path.getsize(self.output_path) / (1024 * 1024)
        print(f"📊 Output file size: {file_size:.1f} MB")
    
    def process(self):
        """Main processing pipeline"""
        print("=" * 70)
        print("🎬 INTELLIGENT VIDEO EDITOR - Arogya.ai Demo")
        print("=" * 70)
        
        # Step 1: Analyze video
        video_info = self.analyze_video()
        
        # Step 2: Identify key segments
        segments = self.identify_key_segments(video_info)
        
        # Step 3: Optimize segments to fit target duration
        optimized_segments = self.optimize_segments(segments, self.target_duration)
        
        # Step 4: Create final video
        self.create_final_video(optimized_segments)
        
        print("\n" + "=" * 70)
        print("✅ COMPLETE! Your 3-minute demo video is ready!")
        print("=" * 70)
        print(f"\n📁 Output: {self.output_path}")
        print(f"⏱️ Duration: ~{self.target_duration} seconds")
        print(f"🎤 Voiceover: Included")
        print(f"📤 Ready to upload to YouTube!")
        
        return self.output_path


def main():
    """Main entry point"""
    
    # File paths
    video_path = r"C:\Projects\Challenge\DecentralizedHealthcare\Video\Sign In - Arogya.ai - Google Chrome 2026-03-08 16-58-53.mp4"
    audio_path = r"C:\Projects\Challenge\DecentralizedHealthcare\Video\custom-voiceover-3min.mp3"
    output_path = r"C:\Projects\Challenge\DecentralizedHealthcare\Video\Arogya_AI_Demo_Final.mp4"
    
    # Check if files exist
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        return
    
    if not os.path.exists(audio_path):
        print(f"❌ Error: Audio file not found: {audio_path}")
        return
    
    # Create editor and process
    editor = IntelligentVideoEditor(video_path, audio_path, output_path)
    editor.process()


if __name__ == "__main__":
    main()
