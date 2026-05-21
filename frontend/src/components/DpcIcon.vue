<script setup>
import { computed } from 'vue'
import {
  ArrowRight, ArrowLeft, Check, Eye, EyeOff, User, Mail, Lock,
  Building2, Globe, Armchair, Star, BarChart2, CircleDollarSign,
  Clock, List, LayoutGrid, Settings, Package, Calendar, Sparkles,
  Info, AlertTriangle, TrendingUp, Download, Plus, Pencil,
  Stethoscope, Receipt, HelpCircle, ChevronDown, ChevronRight,
  ChevronLeft, X, Trash2, Save, RefreshCw, LogOut, Shield,
  Users, FileText, Zap, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-vue-next'

const iconMap = {
  ArrowRight, ArrowLeft, Check, Eye, EyeOff, User, Mail, Lock,
  Building2, Globe, Armchair, Star, BarChart2, CircleDollarSign,
  Clock, List, LayoutGrid, Settings, Package, Calendar, Sparkles,
  Info, AlertTriangle, TrendingUp, Download, Plus, Pencil,
  Stethoscope, Receipt, HelpCircle, ChevronDown, ChevronRight,
  ChevronLeft, X, Trash2, Save, RefreshCw, LogOut, Shield,
  Users, FileText, Zap, CheckCircle2, XCircle, AlertCircle,
}

const props = defineProps({
  name:        { type: String, required: true },
  size:        { type: Number, default: 18 },
  strokeWidth: { type: Number, default: 1.6 },
})

const Comp = computed(() => iconMap[props.name] ?? HelpCircle)
</script>

<template>
  <component :is="Comp" :size="size" :stroke-width="strokeWidth" />
</template>
