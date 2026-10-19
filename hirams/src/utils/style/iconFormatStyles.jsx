import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined"; // TIN
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined"; // Bank
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"; // Password
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail"; // Email
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined"; // Phone
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined"; // Username
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import HowToRegOutlined from "@mui/icons-material/HowToRegOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import DoneAllOutlined from "@mui/icons-material/DoneAllOutlined";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import ThumbUpOutlined from "@mui/icons-material/ThumbUpOutlined";
import AssignmentIndOutlined from "@mui/icons-material/AssignmentIndOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import PriceChangeOutlined from "@mui/icons-material/PriceChangeOutlined";
import CallSplitOutlined from "@mui/icons-material/CallSplitOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import RestoreOutlined from "@mui/icons-material/RestoreOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import FilterListOutlined from "@mui/icons-material/FilterListOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import FileDonwloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import RequestQuoteOutlined from "@mui/icons-material/RequestQuoteOutlined"; // Quote
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined"; // Delivery
import PrintOutlined from "@mui/icons-material/PrintOutlined"; // Print
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined"; // Manage
import CalculateOutlined from "@mui/icons-material/CalculateOutlined"; // Calculator
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
// Keyed to match BaseButton's ACTION_COLORS, so actionColor="cancel"
// and icon={icons.cancel} stay conceptually paired.
const icons = {
  default: null,

  login: <LoginOutlined />,
  register: <HowToRegOutlined />,
  add: <AddOutlined />,
  edit: <EditOutlined />,
  delete: <DeleteOutline />,
  view: <VisibilityOutlined />,
  submit: <SendOutlined />,
  save: <SaveOutlined />,
  approve: <CheckCircleOutline />,
  finalize: <DoneAllOutlined />,
  verify: <VerifiedOutlined />,
  apply: <RuleOutlined />,
  confirm: <ThumbUpOutlined />,
  assign: <AssignmentIndOutlined />,
  reassign: <SwapHorizOutlined />,
  markup: <PriceChangeOutlined />,
  breakdown: <CallSplitOutlined />,
  deactivate: <BlockOutlined />,
  cancel: <CancelOutlined />,
  revert: <RestoreOutlined />,
  reset: <RefreshOutlined />,
  back: <ArrowBackOutlined />,
  close: <CloseOutlined />,
  open: <OpenInNewOutlined />,
  status: <EmojiEventsOutlined />,
  // "Change Status" actions — a check circle reads as status at a glance,
  // where the trophy above reads as an award. Separate key (rather than
  // reusing `check`) so CanvasView's Update Status button stays untouched.
  statusChange: <CheckCircleOutlined />,
  export: <FileDonwloadOutlined />,
  filter: <FilterListOutlined />,
  archived: <ArchiveOutlined />,
  unarchived: <UnarchiveOutlined />,
  quote: <RequestQuoteOutlined />,
  print: <PrintOutlined />,
  manage: <ManageAccountsOutlined />,

  delivery: <LocalShippingOutlined />,
  tin: <BadgeOutlinedIcon />,
  bank: <AccountBalanceOutlinedIcon />,
  password: <LockOutlinedIcon />,
  email: <AlternateEmailIcon />,
  phone: <PhoneIphoneOutlinedIcon />,
  username: <AccountCircleOutlinedIcon />,
  copy: <ContentCopyOutlined />,
  check: <CheckCircleOutlined />,
  // ADD to the icons object
  report: <AssessmentOutlined />,
  // Opens the floating CalculatorWidget from inside a peso field.
  calculator: <CalculateOutlined />,
};

export default icons;
