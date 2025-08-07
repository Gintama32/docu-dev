#!/usr/bin/env python3
"""
Simple script to create a user account for the DocuMaker application.
Run this after setting up the database to create your first user.
"""

import sys
from getpass import getpass
from sqlalchemy.exc import IntegrityError
from backend.database import SessionLocal
from backend.crud import create_user
from backend.schemas import UserCreate

def main():
    print("🚀 DocuMaker User Creation Script")
    print("=" * 40)
    
    # Get user input
    email = input("Enter email address: ").strip()
    if not email:
        print("❌ Email is required!")
        return
    
    full_name = input("Enter full name: ").strip()
    if not full_name:
        print("❌ Full name is required!")
        return
    
    password = getpass("Enter password: ").strip()
    if not password:
        print("❌ Password is required!")
        return
    
    # Optional fields
    department = input("Enter department (optional): ").strip() or None
    job_title = input("Enter job title (optional): ").strip() or None
    
    # Create user
    db = SessionLocal()
    try:
        user_data = UserCreate(
            email=email,
            full_name=full_name,
            password=password,
            department=department,
            job_title=job_title
        )
        
        user = create_user(db, user_data)
        
        print("\n✅ User created successfully!")
        print(f"📧 Email: {user.email}")
        print(f"👤 Name: {user.full_name}")
        print(f"🆔 User ID: {user.id}")
        if user.department:
            print(f"🏢 Department: {user.department}")
        if user.job_title:
            print(f"💼 Job Title: {user.job_title}")
        
        print("\n🎉 You can now log in to the application!")
        
    except IntegrityError as e:
        print(f"\n❌ Error: User with email '{email}' already exists!")
        print("Please try with a different email address.")
        
    except Exception as e:
        print(f"\n❌ Error creating user: {str(e)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
