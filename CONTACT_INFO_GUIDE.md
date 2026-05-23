# 📞 Contact Information Management Guide

## Overview

The system allows Super Admins to manage contact information that appears on all users' Subscription pages. This provides a centralized way to update support contact details across the entire platform.

---

## 🔄 How It Works

### 1. **Super Admin Sets Contact Info**

**Location**: `/app/super-admin` (requires super admin role)

**Fields Available**:
- **Email (EN)**: English version email address
- **Phone (EN)**: English version phone number  
- **WhatsApp (EN)**: English version WhatsApp number
- **Email (AR)**: Arabic version email address
- **Phone (AR)**: Arabic version phone number
- **WhatsApp (AR)**: Arabic version WhatsApp number

**How to Update**:
1. Navigate to Super Admin dashboard
2. Find the "Contact Information" section
3. Click "Edit" button
4. Fill in contact details for both languages
5. Click "Save changes"

---

### 2. **Backend Storage**

**API Endpoint**: `PUT /api/super-admin/settings/contact`

**Storage**: Settings are stored in the database via `app_settings` table

**Example Payload**:
```json
{
  "contact_email": "support@example.com",
  "contact_phone": "+201015755890",
  "contact_whatsapp": "+201015755890",
  "contact_email_ar": "support@example.com",
  "contact_phone_ar": "+201015755890",
  "contact_whatsapp_ar": "+201015755890"
}
```

---

### 3. **Public Access**

**API Endpoint**: `GET /api/contact-info`

**Access**: Public (no authentication required)

**Caching**: 1 hour cache to reduce database load

**Response**:
```json
{
  "contact_email": "support@example.com",
  "contact_phone": "+201015755890",
  "contact_whatsapp": "+201015755890",
  "contact_email_ar": "support@example.com",
  "contact_phone_ar": "+201015755890",
  "contact_whatsapp_ar": "+201015755890"
}
```

---

### 4. **Display on Subscription Page**

**Location**: `/app/subscription` (all users)

**Language-Aware Display**:
- When user is in **English mode**: Uses `contact_email`, `contact_phone`, `contact_whatsapp`
- When user is in **Arabic mode**: Uses `contact_email_ar`, `contact_phone_ar`, `contact_whatsapp_ar` (falls back to EN if AR not set)

**Contact Methods Displayed**:

1. **Email Button** (if contact_email is set)
   - Icon: Mail envelope
   - Action: Opens user's email client with `mailto:` link
   - Label: "Email us" (EN) / "راسلنا" (AR)

2. **Phone Button** (if contact_phone is set)
   - Icon: Phone
   - Action: Initiates phone call with `tel:` link
   - Label: "Call us" (EN) / "اتصل بنا" (AR)

3. **WhatsApp Button** (if contact_whatsapp is set)
   - Icon: Message circle
   - Action: Opens WhatsApp with the number
   - Label: "WhatsApp" (both languages)
   - Style: Teal (primary CTA)

**Fallback**: If no contact info is set, displays: "Contact your admin"

---

## 📱 Visual Example

### Subscription Page Contact Section

```
┌─────────────────────────────────────────────────────┐
│ 🎧 Contact Support                                  │
│                                                      │
│ To upgrade or ask about your subscription.          │
│                                                      │
│  [✉️ Email us]  [📞 Call us]  [💬 WhatsApp]        │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Premium Design Features

The contact card includes:
- **Glassmorphic background** with navy gradient
- **Pulsing glow effect** that animates every 4 seconds
- **Hover lift** on all buttons
- **Responsive layout** - stacks vertically on mobile
- **Icon badges** for visual clarity

---

## 🔧 Technical Implementation

### Frontend (SubscriptionView.vue)

```vue
<script setup>
// Fetch contact info on mount
const contactInfo = ref({})

onMounted(async () => {
  const { data } = await axios.get('/api/contact-info')
  contactInfo.value = data
})

// Language-aware computed properties
const contactEmail = computed(() => {
  const key = isAr.value ? 'contact_email_ar' : 'contact_email'
  return contactInfo.value[key] || contactInfo.value.contact_email
})

const contactPhone = computed(() => {
  const key = isAr.value ? 'contact_phone_ar' : 'contact_phone'
  return contactInfo.value[key] || contactInfo.value.contact_phone
})

const contactWhatsApp = computed(() => {
  const key = isAr.value ? 'contact_whatsapp_ar' : 'contact_whatsapp'
  return contactInfo.value[key] || contactInfo.value.contact_whatsapp
})
</script>

<template>
  <!-- Email -->
  <a v-if="contactEmail" :href="`mailto:${contactEmail}`">
    Email us
  </a>
  
  <!-- Phone -->
  <a v-if="contactPhone" :href="`tel:${contactPhone}`">
    Call us
  </a>
  
  <!-- WhatsApp -->
  <a v-if="contactWhatsApp" 
     :href="`https://wa.me/${contactWhatsApp.replace(/\D/g,'')}`"
     target="_blank">
    WhatsApp
  </a>
</template>
```

### Backend (app.py)

```python
@app.route('/api/contact-info')
def api_public_contact_info():
    """Public endpoint - no auth required"""
    from modules.models import get_contact_info
    info = get_contact_info()
    
    # Cache for 1 hour
    response = jsonify(info)
    response.cache_control.max_age = 3600
    response.cache_control.public = True
    return response

@app.route('/api/super-admin/settings/contact', methods=['PUT'])
@login_required
@role_required('super_admin')
def update_contact_settings():
    """Super admin only - update contact info"""
    data = request.json
    fields = ['contact_email', 'contact_phone', 'contact_whatsapp',
              'contact_email_ar', 'contact_phone_ar', 'contact_whatsapp_ar']
    
    for field in fields:
        if field in data:
            set_app_setting(field, data[field])
    
    return jsonify(get_contact_info())
```

---

## ✅ Testing Checklist

### As Super Admin:

1. [ ] Navigate to `/app/super-admin`
2. [ ] Locate "Contact Information" section
3. [ ] Click "Edit" button
4. [ ] Enter test values:
   - Email (EN): `support@dentalcalc.com`
   - Phone (EN): `+201234567890`
   - WhatsApp (EN): `+201234567890`
   - (Optionally fill Arabic versions)
5. [ ] Click "Save changes"
6. [ ] Verify success message

### As Regular User:

1. [ ] Navigate to `/app/subscription`
2. [ ] Scroll to "Contact Support" section
3. [ ] Verify all three buttons appear:
   - Email button with correct mailto link
   - Phone button with correct tel link
   - WhatsApp button with correct wa.me link
4. [ ] Toggle language to Arabic
5. [ ] Verify contact info updates (if AR versions set)
6. [ ] Click each button to test functionality

### API Testing:

```bash
# Fetch contact info
curl http://localhost:5000/api/contact-info

# Expected response:
{
  "contact_email": "support@dentalcalc.com",
  "contact_phone": "+201234567890",
  "contact_whatsapp": "+201234567890",
  ...
}
```

---

## 🔒 Security & Privacy

- **Public Access**: Contact info is intentionally public
- **Rate Limiting**: Consider adding rate limits if needed
- **Validation**: Super admin input is validated
- **XSS Protection**: All user inputs are sanitized
- **Cache Invalidation**: Updates clear cache after 1 hour max

---

## 🎯 Best Practices

### For Super Admins:

1. **Use Consistent Formatting**
   - Phone: `+[country code][number]` (e.g., `+201234567890`)
   - Email: Valid email format
   - WhatsApp: Same as phone number

2. **Provide Both Languages**
   - Fill both EN and AR versions for better UX
   - AR versions can use same values if no translation needed

3. **Test After Updates**
   - Visit subscription page to verify display
   - Click each contact method to ensure links work

4. **Regular Review**
   - Update contact info when support channels change
   - Verify WhatsApp number is monitored
   - Ensure email inbox is checked regularly

### For Developers:

1. **Cache Awareness**
   - Remember 1-hour cache when testing
   - Clear cache after updates if immediate display needed

2. **Fallback Handling**
   - Always handle missing contact info gracefully
   - Show clear message when no contact set

3. **Accessibility**
   - Ensure buttons have proper ARIA labels
   - Test with screen readers
   - Verify keyboard navigation works

---

## 📊 Analytics (Optional)

Consider tracking:
- Contact method click rates (Email vs Phone vs WhatsApp)
- Conversion from contact to subscription upgrade
- Most popular contact method by user segment

---

## 🐛 Troubleshooting

### Issue: Contact info not appearing on Subscription page

**Check**:
1. Verify super admin saved the settings
2. Check browser network tab for `/api/contact-info` call
3. Inspect response data
4. Clear browser cache (1-hour cache may be stale)

### Issue: Wrong contact info showing

**Check**:
1. Verify language mode (EN vs AR)
2. Check if AR versions are set (falls back to EN)
3. Inspect `contactInfo` object in browser console

### Issue: Buttons not working

**Check**:
1. Verify phone numbers start with `+` and country code
2. Check email format is valid
3. Inspect href attribute in browser DevTools

---

## 📝 Summary

✅ **Super Admin** manages contact info in one place  
✅ **Public API** serves info to all users (cached)  
✅ **Subscription page** displays language-aware contact methods  
✅ **Automatic fallback** from AR to EN if not set  
✅ **Premium UI** with glassmorphic card and animations  

**Result**: Centralized, maintainable, user-friendly contact management system! 🎉
